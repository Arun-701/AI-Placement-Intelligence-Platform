"""
Supervised ML topic classification service.

Pipeline:
Question
   ↓
Sentence Transformer embedding
   ↓
Domain classifier
   ↓
Domain-specific topic classifier
   ↓
Topic + confidence
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
from sentence_transformers import SentenceTransformer


# ---------------------------------------------------------
# MODEL PATHS
# ---------------------------------------------------------

SERVICE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SERVICE_DIR.parent.parent

MODEL_STORAGE_PATH = BACKEND_DIR / "models" / "topic_classifier"

DOMAIN_MODEL_PATH = MODEL_STORAGE_PATH / "best_domain_classifier.joblib"
METADATA_PATH = MODEL_STORAGE_PATH / "classifier_metadata.json"


# ---------------------------------------------------------
# MODEL LOADING
# ---------------------------------------------------------

_embedding_model = None
_domain_model = None
_topic_models = {}


def _load_embedding_model():
    """
    Load Sentence Transformer only once.
    """
    global _embedding_model

    if _embedding_model is None:
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

    return _embedding_model


def _load_models():
    """
    Load domain classifier and all domain-specific
    topic classifiers.
    """
    global _domain_model
    global _topic_models

    if _domain_model is not None:
        return

    if not DOMAIN_MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Domain classifier not found: {DOMAIN_MODEL_PATH}"
        )

    _domain_model = joblib.load(DOMAIN_MODEL_PATH)

    if not METADATA_PATH.exists():
        raise FileNotFoundError(
            f"Classifier metadata not found: {METADATA_PATH}"
        )

    import json

    with METADATA_PATH.open("r", encoding="utf-8") as file:
        metadata = json.load(file)

    topic_models = metadata.get("topic_models", {})

    for domain_name, model_info in topic_models.items():
        filename = model_info.get("filename")

        if not filename:
            continue

        model_path = MODEL_STORAGE_PATH / filename

        if model_path.exists():
            _topic_models[domain_name] = joblib.load(model_path)


# ---------------------------------------------------------
# EMBEDDING
# ---------------------------------------------------------

def _generate_embedding(question: str):
    """
    Generate Sentence Transformer embedding.
    """

    model = _load_embedding_model()

    embedding = model.encode(
        [question],
        show_progress_bar=False
    )

    return embedding


# ---------------------------------------------------------
# CONFIDENCE
# ---------------------------------------------------------

def _get_prediction_confidence(model, embedding, prediction) -> float:
    """
    Get probability/confidence of the predicted class.
    """

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(embedding)

        classes = model.classes_

        for index, class_name in enumerate(classes):
            if class_name == prediction:
                return float(probabilities[0][index])

    return 0.0


# ---------------------------------------------------------
# SINGLE QUESTION CLASSIFICATION
# ---------------------------------------------------------

def classify_question(question: str) -> dict[str, Any]:
    """
    Classify one question into:

    Domain
    Topic
    Confidence
    Source
    """

    if not question or not question.strip():
        raise ValueError("Question cannot be empty.")

    _load_models()

    embedding = _generate_embedding(question)

    # ---------------------------------------------
    # STEP 1: DOMAIN CLASSIFICATION
    # ---------------------------------------------

    domain_prediction = _domain_model.predict(embedding)[0]

    domain_confidence = _get_prediction_confidence(
        _domain_model,
        embedding,
        domain_prediction
    )

    domain = str(domain_prediction)

    # ---------------------------------------------
    # STEP 2: DOMAIN-SPECIFIC TOPIC CLASSIFICATION
    # ---------------------------------------------

    topic_model = _topic_models.get(domain)

    if topic_model is None:
        return {
            "question": question,
            "domain": domain,
            "topic": None,
            "confidence": domain_confidence,
            "domainConfidence": domain_confidence,
            "topicConfidence": 0.0,
            "source": "ml_fallback",
        }

    topic_prediction = topic_model.predict(embedding)[0]

    topic_confidence = _get_prediction_confidence(
        topic_model,
        embedding,
        topic_prediction
    )

    # Use topic confidence as the main confidence.
    confidence = topic_confidence

    return {
        "question": question,
        "domain": domain,
        "topic": str(topic_prediction),
        "confidence": round(confidence, 4),
        "domainConfidence": round(domain_confidence, 4),
        "topicConfidence": round(topic_confidence, 4),
        "source": "ml",
    }


# ---------------------------------------------------------
# MULTIPLE QUESTIONS
# ---------------------------------------------------------

def classify_questions(questions: list[str]) -> list[dict[str, Any]]:
    """
    Classify multiple questions.
    """

    if not questions:
        return []

    return [
        classify_question(question)
        for question in questions
    ]


# ---------------------------------------------------------
# MODEL STATUS
# ---------------------------------------------------------

def get_model_status() -> dict[str, Any]:
    """
    Return information about loaded ML models.
    """

    _load_models()

    return {
        "embeddingModel": "all-MiniLM-L6-v2",
        "domainModel": "best_domain_classifier.joblib",
        "topicModelsLoaded": len(_topic_models),
        "domains": sorted(_topic_models.keys()),
        "modelStorage": str(MODEL_STORAGE_PATH),
    }


# ---------------------------------------------------------
# SERVICE CLASS (thin wrapper for FastAPI compatibility)
# ---------------------------------------------------------

class TopicClassifierService:
    """
    Thin wrapper around ML classification functions.
    Provides a class-based interface for use in FastAPI endpoints.
    """

    def predict_domain(self, question: str) -> str:
        """Predict domain for a question."""
        result = classify_question(question)
        return result.get("domain", "Unknown")

    def predict_topic(self, question: str, domain: str) -> str:
        """Predict topic for a question in a given domain."""
        result = classify_question(question)
        return result.get("topic", "Unknown")

    def calculate_confidence(self, topic: str) -> float:
        """Calculate confidence for a classification."""
        # This is a simplified method that returns a fixed high confidence
        # since the actual confidence is calculated during classification
        return 0.85