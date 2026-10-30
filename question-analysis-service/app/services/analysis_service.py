"""Analysis orchestration using domain-independent topic discovery."""
from __future__ import annotations

import os
from collections import Counter

from app.services.difficulty_service import estimate_difficulty
from app.services.question_extractor import extract_questions
from app.services.ontology_service import normalize_and_merge
from app.services.topic_classifier_service import classify_questions as ml_classify_questions

DIFFICULTY_VALUE = {"Easy": 35, "Medium": 65, "Hard": 100}
AUTO_SUBJECT = "Auto-Discovered"


def _get_ml_confidence_threshold() -> float:
    """Get ML model confidence threshold."""
    try:
        return max(0.0, min(1.0, float(os.getenv("ML_CONFIDENCE_THRESHOLD", "0.60"))))
    except (TypeError, ValueError):
        return 0.60


def _build_ml_cluster(question_index: int, question: str, ml_result: dict) -> dict:
    """Build a cluster dict from ML classification result."""
    return {
        "label": ml_result.get("topic", "Unknown"),
        "domain": ml_result.get("domain") or "Auto-Discovered",
        "subtopics": [],
        "indices": [question_index],
        "confidence": float(ml_result.get("topicConfidence", 0.0) or 0.0),
        "source": "ml",
        "representativeQuestion": question,
    }


def _resolve_subject(cluster: dict) -> str:
    """Use the actual ML domain as the subject; fall back to Auto-Discovered only if absent."""
    return cluster.get("domain") or cluster.get("subject") or AUTO_SUBJECT


def analyze_text(text: str) -> dict:
    questions = extract_questions(text)
    if not questions:
        raise ValueError("No valid questions found. Add one question per line or use question marks.")

    ml_threshold = _get_ml_confidence_threshold()
    ml_results = ml_classify_questions(questions)

    classified_clusters = []
    successful_ml_count = 0

    for idx, (question, ml_result) in enumerate(zip(questions, ml_results)):
        if not isinstance(ml_result, dict):
            continue
        topic = ml_result.get("topic")
        domain = ml_result.get("domain")
        topic_confidence = float(ml_result.get("topicConfidence", 0.0) or 0.0)
        if not topic or not domain:
            continue
        cluster = _build_ml_cluster(idx, question, ml_result)
        if topic_confidence >= ml_threshold:
            cluster["confidence"] = topic_confidence
        else:
            cluster["confidence"] = topic_confidence
        classified_clusters.append(cluster)
        successful_ml_count += 1

    if not classified_clusters:
        return {
            "totalQuestions": len(questions),
            "topics": [],
            "subjectDistribution": {AUTO_SUBJECT: 0},
            "difficultyDistribution": {},
            "recommendedStudyOrder": [],
            "mlQuestions": 0,
            "geminiQuestions": 0,
            "geminiUsed": False,
        }

    normalized_clusters = normalize_and_merge(classified_clusters, questions)
    classified = [cluster for cluster in normalized_clusters if cluster["label"] != "Other / Unclassified"]

    max_count = max((len(cluster["indices"]) for cluster in classified), default=1)
    topics = []
    subject_distribution: dict[str, int] = {}
    for cluster in classified:
        subject = _resolve_subject(cluster)
        subject_distribution[subject] = subject_distribution.get(subject, 0) + len(cluster["indices"])
        difficulties = [estimate_difficulty(questions[index]) for index in cluster["indices"]]
        average_difficulty = round(sum(DIFFICULTY_VALUE[value] for value in difficulties) / len(difficulties))
        frequency = len(cluster["indices"]) / max_count * 100
        score = round(0.5 * frequency + 0.3 * average_difficulty + 0.2 * 85)
        priority = "Very High" if score >= 80 else "High" if score >= 60 else "Medium" if score >= 40 else "Low"

        topics.append(
            {
                "subject": subject,
                "domain": subject,
                "topic": cluster["label"],
                "subtopics": cluster.get("subtopics", []),
                "questionCount": len(cluster["indices"]),
                "difficulty": Counter(difficulties).most_common(1)[0][0],
                "priorityScore": min(100, score),
                "priority": priority,
                "confidence": float(cluster.get("confidence", 0.0) or 0.0),
                "source": "ml",
            }
        )

    topics.sort(key=lambda item: (-item["priorityScore"], -item["questionCount"]))
    all_difficulties = [estimate_difficulty(question) for question in questions]

    return {
        "totalQuestions": len(questions),
        "topics": topics,
        "subjectDistribution": subject_distribution or {AUTO_SUBJECT: 0},
        "difficultyDistribution": dict(Counter(all_difficulties)),
        "recommendedStudyOrder": [item["topic"] for item in topics],
        "mlQuestions": successful_ml_count,
        "geminiQuestions": 0,
        "geminiUsed": False,
    }
