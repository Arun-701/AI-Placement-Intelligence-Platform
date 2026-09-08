import json

from app.services import gemini_service
from app.services.analysis_service import analyze_text
from app.services.ontology_service import normalize_and_merge


def test_high_confidence_ml_result_skips_gemini(monkeypatch):
    questions = [
        "What is React?",
        "How do React hooks work?",
    ]

    monkeypatch.setattr(
        "app.services.analysis_service.discover_topics",
        lambda _: [{
            "label": "React",
            "subtopics": ["Hooks"],
            "indices": [0, 1],
            "confidence": 0.91,
            "representativeQuestion": "What is React?",
            "representativeQuestions": ["What is React?"],
        }],
    )
    monkeypatch.setattr("app.services.analysis_service.normalize_and_merge", lambda clusters, _: clusters)

    called = {"value": False}

    def fake_classify(_questions):
        called["value"] = True
        return [{"questionId": 0, "domain": "Full Stack Development", "topic": "React", "subtopic": "Hooks", "confidence": 0.88}]

    monkeypatch.setattr("app.services.analysis_service.classify_questions", fake_classify)

    result = analyze_text("\n".join(questions))

    assert called["value"] is False
    assert result["geminiUsed"] is False
    assert result["topics"][0]["source"] == "ml"
    assert result["topics"][0]["topic"] == "React"


def test_low_confidence_result_calls_gemini(monkeypatch):
    questions = [
        "What is React?",
        "How do React hooks work?",
    ]

    monkeypatch.setattr(
        "app.services.analysis_service.discover_topics",
        lambda _: [{
            "label": "React",
            "subtopics": ["Hooks"],
            "indices": [0, 1],
            "confidence": 0.41,
            "representativeQuestion": "What is React?",
            "representativeQuestions": ["What is React?", "How do React hooks work?"],
        }],
    )
    monkeypatch.setattr("app.services.analysis_service.normalize_and_merge", lambda clusters, _: clusters)

    def fake_classify(_questions):
        return [{"questionId": 0, "domain": "Full Stack Development", "topic": "React", "subtopic": "Hooks", "confidence": 0.88}]

    monkeypatch.setattr("app.services.analysis_service.classify_questions", fake_classify)

    result = analyze_text("\n".join(questions))

    assert result["geminiUsed"] is True
    assert result["geminiQuestions"] == 2
    assert result["topics"][0]["source"] == "gemini"
    assert result["topics"][0]["subtopics"] == ["Hooks"]


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


def test_gemini_api_failure_keeps_existing_ml_result(monkeypatch):
    questions = [
        "What is React?",
        "How do React hooks work?",
    ]

    monkeypatch.setattr(
        "app.services.analysis_service.discover_topics",
        lambda _: [{
            "label": "React",
            "subtopics": ["Hooks"],
            "indices": [0, 1],
            "confidence": 0.31,
            "representativeQuestion": "What is React?",
            "representativeQuestions": ["What is React?", "How do React hooks work?"],
        }],
    )
    monkeypatch.setattr("app.services.analysis_service.normalize_and_merge", lambda clusters, _: clusters)
    monkeypatch.setattr("app.services.analysis_service.classify_questions", lambda _questions: [])

    result = analyze_text("\n".join(questions))

    assert result["geminiUsed"] is True
    assert result["topics"][0]["source"] == "ml_fallback"
    assert result["topics"][0]["topic"] == "React"


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


def test_gemini_result_still_passes_through_ontology_normalization():
    clusters = [
        {"label": "AWS", "subtopics": [], "indices": [0], "confidence": 0.73, "representativeQuestion": "Explain AWS services.", "representativeQuestions": ["Explain AWS services."]},
        {"label": "OpenStack", "subtopics": [], "indices": [1], "confidence": 0.74, "representativeQuestion": "Explain OpenStack networking.", "representativeQuestions": ["Explain OpenStack networking."]},
        {"label": "Eucalyptus", "subtopics": [], "indices": [2], "confidence": 0.75, "representativeQuestion": "Explain Eucalyptus cloud deployment.", "representativeQuestions": ["Explain Eucalyptus cloud deployment."]},
    ]
    questions = [
        "Explain AWS services.",
        "Explain OpenStack networking.",
        "Explain Eucalyptus cloud deployment.",
    ]

    merged = normalize_and_merge(clusters, questions)
    labels = {item["label"] for item in merged}
    assert "Cloud Platforms" in labels or any("Cloud" in item["label"] for item in merged)


def test_priority_is_computed_by_application_logic_not_gemini(monkeypatch):
    questions = [
        "What is React?",
        "How do React hooks work?",
    ]

    monkeypatch.setattr(
        "app.services.analysis_service.discover_topics",
        lambda _: [{
            "label": "React",
            "subtopics": ["Hooks"],
            "indices": [0, 1],
            "confidence": 0.48,
            "representativeQuestion": "What is React?",
            "representativeQuestions": ["What is React?", "How do React hooks work?"],
        }],
    )
    monkeypatch.setattr("app.services.analysis_service.normalize_and_merge", lambda clusters, _: clusters)
    monkeypatch.setattr(
        "app.services.analysis_service.classify_questions",
        lambda _questions: [{"questionId": 0, "domain": "Full Stack Development", "topic": "React", "subtopic": "Hooks", "confidence": 0.88}],
    )

    result = analyze_text("\n".join(questions))

    assert result["topics"][0]["priorityScore"] >= 0
    assert result["topics"][0]["priority"] in {"Low", "Medium", "High", "Very High"}
    assert isinstance(result["topics"][0]["confidence"], float)
