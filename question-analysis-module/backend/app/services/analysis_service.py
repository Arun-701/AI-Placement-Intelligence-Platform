"""Analysis orchestration using domain-independent topic discovery."""
from __future__ import annotations

import os
from collections import Counter

from app.services.difficulty_service import estimate_difficulty
from app.services.gemini_service import classify_questions
from app.services.question_extractor import extract_questions
from app.services.topic_discovery_service import discover_topics
from app.services.ontology_service import normalize_and_merge

DIFFICULTY_VALUE = {"Easy": 35, "Medium": 65, "Hard": 100}
AUTO_SUBJECT = "Auto-Discovered"


def _get_confidence_threshold() -> float:
    try:
        return max(0.0, min(1.0, float(os.getenv("LLM_CONFIDENCE_THRESHOLD", "0.60"))))
    except (TypeError, ValueError):
        return 0.60


def _build_topic_sources_by_indices(clusters: list[dict]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for cluster in clusters:
        key = tuple(sorted(int(index) for index in cluster.get("indices", [])))
        if key:
            mapping[key] = cluster.get("source", "ml")
    return mapping


def _resolve_cluster_source(cluster: dict, candidate_clusters: list[dict]) -> str:
    indices = set(cluster.get("indices", []))
    sources = {item.get("source", "ml") for item in candidate_clusters if set(item.get("indices", [])) & indices}
    if "gemini" in sources:
        return "gemini"
    if "ml_fallback" in sources:
        return "ml_fallback"
    if "ml" in sources:
        return "ml"
    return "ml"


def _apply_gemini_fallback(questions: list[str], clusters: list[dict], threshold: float) -> tuple[list[dict], int, bool]:
    fallback_clusters: list[dict] = []
    gemini_questions: list[tuple[int, str]] = []
    gemini_used = False

    for cluster in clusters:
        confidence = float(cluster.get("confidence", 0.0) or 0.0)
        if confidence >= threshold:
            enriched = dict(cluster)
            enriched["source"] = "ml"
            fallback_clusters.append(enriched)
            continue

        gemini_questions.append((len(gemini_questions), cluster.get("representativeQuestion") or questions[min(cluster.get("indices", [0]))]))

    if gemini_questions:
        gemini_used = True
        gemini_responses = classify_questions([question for _, question in gemini_questions])
        result_map = {
            int(item.get("questionId", index)): item
            for index, item in enumerate(gemini_responses)
        }

        for index, question in gemini_questions:
            cluster = next((item for item in clusters if item.get("representativeQuestion") == question), None)
            if not cluster:
                cluster = next((item for item in clusters if item.get("indices") and len(item.get("indices", [])) > 0 and min(item.get("indices", [])) == 0), None)
            if cluster is None:
                continue

            response = result_map.get(index)
            fallback_cluster = dict(cluster)
            if response and response.get("topic"):
                fallback_cluster["label"] = response.get("topic")
                subtopic = response.get("subtopic")
                if subtopic:
                    fallback_cluster["subtopics"] = [subtopic]
                fallback_cluster["confidence"] = max(float(cluster.get("confidence", 0.0) or 0.0), float(response.get("confidence", 0.0) or 0.0))
                fallback_cluster["source"] = "gemini"
                fallback_cluster["domain"] = response.get("domain")
            else:
                fallback_cluster["source"] = "ml_fallback"
            fallback_clusters.append(fallback_cluster)

    return fallback_clusters, sum(len(cluster.get("indices", [])) for cluster in clusters if float(cluster.get("confidence", 0.0) or 0.0) < threshold), gemini_used


def analyze_text(text: str) -> dict:
    questions = extract_questions(text)
    if not questions:
        raise ValueError("No valid questions found. Add one question per line or use question marks.")

    clusters = discover_topics(questions)
    threshold = _get_confidence_threshold()
    merged_clusters, gemini_question_count, gemini_used = _apply_gemini_fallback(questions, clusters, threshold)

    normalized_clusters = normalize_and_merge(merged_clusters, questions)
    classified = [cluster for cluster in normalized_clusters if cluster["label"] != "Other / Unclassified"]
    max_count = max((len(cluster["indices"]) for cluster in classified), default=1)

    topic_sources = _build_topic_sources_by_indices(merged_clusters)
    topics = []
    for cluster in classified:
        source = _resolve_cluster_source(cluster, merged_clusters)
        difficulties = [estimate_difficulty(questions[index]) for index in cluster["indices"]]
        average_difficulty = round(sum(DIFFICULTY_VALUE[value] for value in difficulties) / len(difficulties))
        frequency = len(cluster["indices"]) / max_count * 100
        score = round(0.5 * frequency + 0.3 * average_difficulty + 0.2 * 85)
        priority = "Very High" if score >= 80 else "High" if score >= 60 else "Medium" if score >= 40 else "Low"
        topics.append(
            {
                "subject": AUTO_SUBJECT,
                "topic": cluster["label"],
                "subtopics": cluster.get("subtopics", []),
                "questionCount": len(cluster["indices"]),
                "difficulty": Counter(difficulties).most_common(1)[0][0],
                "priorityScore": min(100, score),
                "priority": priority,
                "confidence": cluster["confidence"],
                "source": source,
            }
        )

    topics.sort(key=lambda item: (-item["priorityScore"], -item["questionCount"]))
    all_difficulties = [estimate_difficulty(question) for question in questions]
    ml_questions = max(0, len(questions) - gemini_question_count)
    return {
        "totalQuestions": len(questions),
        "topics": topics,
        "subjectDistribution": {AUTO_SUBJECT: sum(len(cluster["indices"]) for cluster in classified)},
        "difficultyDistribution": dict(Counter(all_difficulties)),
        "recommendedStudyOrder": [item["topic"] for item in topics],
        "mlQuestions": ml_questions,
        "geminiQuestions": gemini_question_count,
        "geminiUsed": gemini_used,
    }
