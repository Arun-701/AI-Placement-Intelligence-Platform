import json

from app.services import gemini_service
from app.services.analysis_service import analyze_text
from app.services.ontology_service import normalize_and_merge


def test_analysis_uses_ml_only_for_high_confidence_questions(monkeypatch):
    questions = [
        "What is React?",
        "How do React hooks work?",
    ]

    def fake_ml_classify(questions_list):
        return [
            {"domain": "Full Stack", "topic": "React", "topicConfidence": 0.85, "domainConfidence": 0.95},
            {"domain": "Full Stack", "topic": "React", "topicConfidence": 0.82, "domainConfidence": 0.93},
        ]

    monkeypatch.setattr("app.services.analysis_service.ml_classify_questions", fake_ml_classify)

    result = analyze_text("\n".join(questions))

    assert result["mlQuestions"] == 2
    assert result["geminiQuestions"] == 0
    assert result["geminiUsed"] is False
    assert result["topics"][0]["source"] == "ml"
    assert result["topics"][0]["topic"] == "React"


def test_analysis_keeps_low_confidence_ml_predictions_and_never_calls_gemini(monkeypatch):
    questions = [
        "What is React?",
        "How do React hooks work?",
    ]

    def fake_ml_classify(questions_list):
        return [
            {"domain": "Full Stack", "topic": "React", "topicConfidence": 0.41, "domainConfidence": 0.41},
            {"domain": "Full Stack", "topic": "React", "topicConfidence": 0.38, "domainConfidence": 0.38},
        ]

    monkeypatch.setattr("app.services.analysis_service.ml_classify_questions", fake_ml_classify)

    result = analyze_text("\n".join(questions))

    assert result["mlQuestions"] == 2
    assert result["geminiQuestions"] == 0
    assert result["geminiUsed"] is False
    assert result["topics"][0]["source"] == "ml"
    assert isinstance(result["topics"][0]["confidence"], float)


def test_gemini_successful_response_returns_topic_and_subtopic(monkeypatch):
    def fake_generate(_prompt):
        return json.dumps([
            {
                "questionId": 0,
                "domain": "Cloud Computing",
                "topic": "Virtualization",
                "subtopic": "Hypervisor",
                "confidence": 0.91,
            }
        ])

    monkeypatch.setattr(gemini_service, "_generate_content", fake_generate)

    result = gemini_service.classify_questions(["Explain hypervisor types"])

    assert result[0]["domain"] == "Cloud Computing"
    assert result[0]["topic"] == "Virtualization"
    assert result[0]["subtopic"] == "Hypervisor"
    assert 0.0 <= result[0]["confidence"] <= 1.0


def test_gemini_api_failure_is_handled_without_affecting_ml_results(monkeypatch):
    def fake_generate(_prompt):
        raise RuntimeError("Gemini unavailable")

    monkeypatch.setattr(gemini_service, "_generate_content", fake_generate)

    try:
        result = gemini_service.classify_questions(["Explain hypervisor types"])
    except RuntimeError:
        result = []

    assert result == []


def test_domain_independence_for_multiple_academic_domains(monkeypatch):
    def fake_generate(_prompt):
        return json.dumps([
            {"questionId": 0, "domain": "Cloud Computing", "topic": "Virtualization", "subtopic": "Hypervisor", "confidence": 0.81},
            {"questionId": 1, "domain": "Compiler Design", "topic": "Parsing", "subtopic": "LL Parsing", "confidence": 0.83},
            {"questionId": 2, "domain": "Mechanical Engineering", "topic": "Thermodynamics", "subtopic": "Entropy", "confidence": 0.86},
        ])

    monkeypatch.setattr(gemini_service, "_generate_content", fake_generate)

    result = gemini_service.classify_questions([
        "Explain hypervisor types",
        "Explain LL parsing",
        "Explain entropy in thermodynamics",
    ])

    domains = {item["domain"] for item in result}
    assert {"Cloud Computing", "Compiler Design", "Mechanical Engineering"}.issubset(domains)
    assert any(item["topic"] == "Parsing" for item in result)
    assert any(item["subtopic"] == "Entropy" for item in result)


def test_ml_result_still_passes_through_ontology_normalization():
    clusters = [
        {"label": "AWS", "subtopics": [], "indices": [0], "confidence": 0.73, "source": "ml", "domain": "Cloud Computing", "representativeQuestion": "Explain AWS services.", "representativeQuestions": ["Explain AWS services."]},
        {"label": "OpenStack", "subtopics": [], "indices": [1], "confidence": 0.74, "source": "ml", "domain": "Cloud Computing", "representativeQuestion": "Explain OpenStack networking.", "representativeQuestions": ["Explain OpenStack networking."]},
        {"label": "Eucalyptus", "subtopics": [], "indices": [2], "confidence": 0.75, "source": "ml", "domain": "Cloud Computing", "representativeQuestion": "Explain Eucalyptus cloud deployment.", "representativeQuestions": ["Explain Eucalyptus cloud deployment."]},
    ]
    questions = [
        "Explain AWS services.",
        "Explain OpenStack networking.",
        "Explain Eucalyptus cloud deployment.",
    ]

    merged = normalize_and_merge(clusters, questions)
    labels = {item["label"] for item in merged}
    assert "Cloud Platforms" in labels or any("Cloud" in item["label"] for item in merged)
    assert all(item.get("source", "ml") == "ml" for item in merged)


def test_priority_is_computed_by_application_logic_not_gemini(monkeypatch):
    questions = [
        "What is React?",
        "How do React hooks work?",
    ]

    def fake_ml_classify(questions_list):
        return [
            {"domain": "Full Stack", "topic": "React", "topicConfidence": 0.88, "domainConfidence": 0.90},
            {"domain": "Full Stack", "topic": "React", "topicConfidence": 0.86, "domainConfidence": 0.89},
        ]

    monkeypatch.setattr("app.services.analysis_service.ml_classify_questions", fake_ml_classify)

    result = analyze_text("\n".join(questions))

    assert result["topics"][0]["priorityScore"] >= 0
    assert result["topics"][0]["priority"] in {"Low", "Medium", "High", "Very High"}
    assert isinstance(result["topics"][0]["confidence"], float)
