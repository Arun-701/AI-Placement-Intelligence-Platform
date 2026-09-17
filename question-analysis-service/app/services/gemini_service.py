"""Low-confidence semantic fallback for topic classification using Gemini."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Iterable, Sequence
from urllib import error as urllib_error
from urllib import request as urllib_request

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=False)


DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
DEFAULT_CONFIDENCE_THRESHOLD = float(os.getenv("LLM_CONFIDENCE_THRESHOLD", "0.60"))


def _clean_text(value: str) -> str:
    return (value or "").strip()


def _coerce_confidence(value: Any, fallback: float = 0.0) -> float:
    try:
        coerced = float(value)
    except (TypeError, ValueError):
        return fallback
    if not (0.0 <= coerced <= 1.0):
        return max(0.0, min(1.0, coerced))
    return coerced


def _extract_json_payload(raw_text: str) -> Any:
    text = _clean_text(raw_text)
    if not text:
        return []
    fenced = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL | re.I)
    if fenced:
        text = fenced.group(1)
    if text.startswith("[") or text.startswith("{"):
        return json.loads(text)
    match = re.search(r"(\[.*\]|\{.*\})", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    raise ValueError("Gemini response was not valid JSON.")


def _generate_content(prompt: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    model_name = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    payload = json.dumps(
        {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 800,
                "response_mime_type": "application/json",
            },
        }
    ).encode("utf-8")

    request = urllib_request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib_request.urlopen(request, timeout=20) as response:
        body = response.read().decode("utf-8")
    payload_obj = json.loads(body)
    try:
        return payload_obj["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError):
        raise ValueError("Gemini response did not include generated content.")


def _build_prompt(questions: list[str]) -> str:
    question_payload = json.dumps(
        [{"questionId": index, "question": question} for index, question in enumerate(questions)],
        ensure_ascii=False,
    )
    return (
        "You are an academic question classification assistant.\n"
        "Analyze the complete question and identify the most appropriate academic domain, major topic, and optional subtopic.\n"
        "Do not create topics from isolated words.\n"
        "Do not use generic words such as: explain, discuss, list, describe, method, process, system, data, etc.\n"
        "Return the most meaningful technical or academic concept.\n"
        "If the question is ambiguous, return Other / Unclassified.\n"
        "Return JSON only.\n\n"
        f"Questions:\n{question_payload}\n\n"
        "Expected schema:\n"
        "[{\n"
        "  \"questionId\": 0,\n"
        "  \"domain\": \"...\",\n"
        "  \"topic\": \"...\",\n"
        "  \"subtopic\": \"...\",\n"
        "  \"confidence\": 0.0\n"
        "}]\n"
    )


def _normalise_result(item: dict, fallback_question_id: int | None = None) -> dict:
    cleaned = {
        "questionId": int(item.get("questionId", fallback_question_id if fallback_question_id is not None else 0)),
        "domain": str(item.get("domain") or "Other / Unclassified").strip() or "Other / Unclassified",
        "topic": str(item.get("topic") or "Other / Unclassified").strip() or "Other / Unclassified",
        "subtopic": str(item.get("subtopic") or "").strip(),
        "confidence": _coerce_confidence(item.get("confidence"), 0.0),
    }
    if not cleaned["subtopic"] or cleaned["subtopic"].lower() in {"none", "n/a"}:
        cleaned["subtopic"] = ""
    return cleaned


def classify_questions(questions: Sequence[str] | str) -> list[dict]:
    """Return structured topic classifications for one or more questions."""
    if isinstance(questions, str):
        questions = [questions]

    valid_questions = [str(question).strip() for question in questions if str(question).strip()]
    if not valid_questions:
        return []

    if len(valid_questions) == 1:
        prompt = _build_prompt(valid_questions)
    else:
        prompt = _build_prompt(valid_questions)

    try:
        response_text = _generate_content(prompt)
        payload = _extract_json_payload(response_text)
    except (RuntimeError, ValueError, json.JSONDecodeError, urllib_error.URLError, TimeoutError, OSError):
        return []
    except Exception:
        return []

    if isinstance(payload, dict):
        if "results" in payload:
            payload = payload["results"]
        elif any(key in payload for key in ("domain", "topic", "subtopic", "confidence")):
            payload = [payload]
        else:
            return []

    if not isinstance(payload, list):
        return []

    normalised: list[dict] = []
    for index, item in enumerate(payload):
        if not isinstance(item, dict):
            continue
        question_id = item.get("questionId")
        if question_id is None:
            question_id = index
        result = _normalise_result(item, fallback_question_id=int(question_id))
        normalised.append(result)

    if not normalised:
        return []

    return normalised


def should_use_gemini(confidence: float, threshold: float | None = None) -> bool:
    effective_threshold = threshold if threshold is not None else DEFAULT_CONFIDENCE_THRESHOLD
    return float(confidence or 0.0) < float(effective_threshold)
