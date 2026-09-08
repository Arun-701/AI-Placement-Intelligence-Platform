"""External ontology loading and optional semantic-cluster normalization."""
from collections import defaultdict
from functools import lru_cache
import json
from pathlib import Path
import re

ONTOLOGY_DIR = Path(__file__).resolve().parents[2] / "ontology"

SPECIAL_TOPIC_ALIASES = {
    "ajax based": "AJAX",
    "ajax": "AJAX",
    "node": "Node.js",
    "node js": "Node.js",
    "bootstrap classes": "Bootstrap",
    "full stack development": "Full Stack Development",
    "mongo db": "MongoDB",
    "mongodb": "MongoDB",
}


def _canonical_topic_name(value: str) -> str:
    text = (value or "").strip()
    if not text:
        return ""
    lowered = text.lower()
    for alias, canonical in SPECIAL_TOPIC_ALIASES.items():
        if alias in lowered or lowered == alias:
            return canonical
    if "full stack" in lowered and "development" in lowered:
        return "Full Stack Development"
    if "ajax" in lowered:
        return "AJAX"
    if "node" in lowered and ("js" in lowered or "javascript" in lowered):
        return "Node.js"
    if "bootstrap" in lowered and "class" in lowered:
        return "Bootstrap"

    cleaned = re.sub(r"\b(?:what|why|how|when|where|who|which|explain|elaborate|describe|discuss|define|list|state|give|show|write|find|perform|performing|construct|convert|mean|means|meaning|significance|steps|details|purpose|role|in|on|of|for|the|a|an)\b", " ", lowered, flags=re.I)
    cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    tokens = [token for token in cleaned.split() if token]
    if len(tokens) >= 2 and tokens[-1] in {"technique", "techniques", "method", "methods", "approach", "approaches", "concept", "concepts", "idea", "ideas", "model", "models", "pattern", "patterns", "principle", "principles"}:
        tokens = tokens[:-1]
    if not tokens:
        return text
    normalized = " ".join(tokens)
    if normalized.endswith("s") and not normalized.endswith("ss") and len(normalized) > 4:
        normalized = normalized[:-1]
    if normalized.upper() in {"LL"}:
        return normalized.upper()
    return normalized.title()


def _dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if not value:
            continue
        canonical = _canonical_topic_name(value)
        if canonical in seen:
            continue
        seen.add(canonical)
        ordered.append(canonical)
    return ordered


@lru_cache(maxsize=1)
def load_concepts() -> list[dict]:
    concepts = []
    for path in ONTOLOGY_DIR.glob("*.json"):
        try:
            concepts.extend(json.loads(path.read_text(encoding="utf-8")).get("concepts", []))
        except (OSError, json.JSONDecodeError):
            continue
    return concepts


def _contains(text: str, alias: str) -> bool:
    return bool(re.search(r"(?<!\w)" + re.escape(alias.lower()) + r"(?!\w)", text.lower()))


def normalize_and_merge(clusters: list[dict], questions: list[str]) -> list[dict]:
    """Apply optional concept→parent mappings after semantic clustering.

    Clusters without an ontology match retain their discovered semantic label.
    """
    concepts = load_concepts()
    merged: dict[str, dict] = {}
    for cluster in clusters:
        members = [questions[index] for index in cluster["indices"]]
        evidence = "\n".join([cluster["label"], *cluster.get("subtopics", []), *members])
        matches = []
        for concept in concepts:
            hit_count = sum(_contains(evidence, alias) for alias in concept.get("aliases", []))
            if hit_count:
                matches.append((hit_count, max(map(len, concept["aliases"])), concept))
        if matches:
            _, _, concept = max(matches, key=lambda match: (match[0], match[1]))
            parent, subtopic = concept["parent"], concept["subtopic"]
            extra_subtopics = []
        else:
            parent, subtopic = cluster["label"], None
            extra_subtopics = cluster.get("subtopics", [])

        parent = _canonical_topic_name(parent)
        subtopic = _canonical_topic_name(subtopic) if subtopic else None
        bucket = merged.setdefault(parent, {"label": parent, "indices": [], "subtopics": [], "confidences": [], "representativeQuestions": []})
        bucket["indices"].extend(cluster["indices"])
        bucket["confidences"].append((cluster["confidence"], len(cluster["indices"])))
        bucket["representativeQuestions"].extend(cluster.get("representativeQuestions", [cluster["representativeQuestion"]]))
        for value in [subtopic, *extra_subtopics]:
            canonical_value = _canonical_topic_name(value) if value else ""
            if canonical_value and canonical_value != parent and canonical_value not in bucket["subtopics"]:
                bucket["subtopics"].append(canonical_value)
        bucket["subtopics"] = _dedupe(bucket["subtopics"])

    result = []
    for bucket in merged.values():
        total = sum(weight for _, weight in bucket["confidences"])
        bucket["confidence"] = round(sum(score * weight for score, weight in bucket["confidences"]) / total, 2)
        bucket["representativeQuestion"] = bucket["representativeQuestions"][0] if bucket["representativeQuestions"] else ""
        bucket.pop("confidences")
        result.append(bucket)
    return result
