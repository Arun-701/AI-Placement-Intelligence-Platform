"""Question splitting designed for typed text and noisy OCR output."""
import re

QUESTION_START = re.compile(r"^\s*(?:\d{1,3}[.)]|\([a-z]\)|\([ivxlcdm]+\)|[a-z][.)])\s+", re.I)
QUESTION_WORDS = re.compile(r"^(?:what|why|how|when|where|who|which|explain|describe|differentiate|compare|define|discuss|write|list|state|illustrate|calculate|design|implement|give)\b", re.I)
NOISE = re.compile(r"(?:page\s*\d+|register\s*(?:no|number)|roll\s*(?:no|number)|college|university|examination|semester|marks|time\s*:|code\s*:|subject\s*:)", re.I)

def _clean(line: str) -> str:
    line = re.sub(r"\s+", " ", line).strip(" -•\t:|")
    return re.sub(r"\s*\[?\d+\s*(?:marks?|m)?\]?\s*$", "", line, flags=re.I)

def _is_question(value: str) -> bool:
    return len(value.split()) >= 2 and len(value) >= 10 and bool(QUESTION_WORDS.match(value) or value.endswith("?")) and not NOISE.search(value)

def extract_questions(text: str) -> list[str]:
    questions, current = [], ""
    for raw in text.replace("\r", "\n").split("\n"):
        if not (raw := _clean(raw)) or NOISE.search(raw): continue
        line = QUESTION_START.sub("", raw)
        # Handles OCR patterns such as "9. (a) Explain ...".
        line = QUESTION_START.sub("", line)
        starts = bool(QUESTION_START.match(raw)) or bool(QUESTION_WORDS.match(line))
        if starts:
            if _is_question(current): questions.append(current)
            current = line
        elif current:
            current = f"{current} {line}"
            if current.endswith("?") and _is_question(current): questions.append(current); current = ""
        elif _is_question(line): questions.append(line)
    if _is_question(current): questions.append(current)
    if not questions:
        questions = [_clean(item) for item in re.split(r"(?<=\?)\s+", text) if _is_question(_clean(item))]
    return list(dict.fromkeys(questions))
