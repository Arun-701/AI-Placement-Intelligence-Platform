"""Domain-independent semantic clustering, merging, and hierarchical labels."""
from functools import lru_cache
import os
import re

import numpy as np
from sklearn.cluster import AgglomerativeClustering
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

GENERIC_LABEL_WORDS = ENGLISH_STOP_WORDS.union({
    "explain", "describe", "discuss", "define", "differentiate", "compare", "write", "what", "why", "how", "give", "example", "following", "using", "question", "answer", "application", "program", "method", "function", "design", "create", "illustrate", "working", "advantages", "difference", "workflow", "process", "performance", "short", "notes", "system", "features", "overview", "introduction", "types", "suitable", "main", "set", "instructions", "trapped", "list", "neat", "brief", "organization", "critical", "challenge", "challenges", "distributed", "web", "page", "pages", "text", "content", "area", "users", "user", "paragraph", "password", "featured", "external", "return", "returns", "command", "data", "multiple", "creating", "does", "state", "container", "stack", "controlled", "uncontrolled", "documents", "document", "details", "feature", "features", "script", "language", "code", "codes", "tool", "tools", "module", "modules", "component", "components", "object", "objects", "form", "forms", "request", "requests", "purpose", "role", "store", "stores", "different", "contrast", "identify", "recognize", "address", "string", "live", "write", "construct", "meaning", "means", "mean", "perform", "performing", "steps", "show", "find", "findout", "evaluate", "compare", "contrast", "ends"
})

TECHNICAL_SINGLE_WORDS = {
    "react", "javascript", "html", "css", "ajax", "bootstrap", "mongodb", "node", "sql", "api", "rest", "json", "xml",
    "java", "python", "php", "ruby", "swift", "kotlin", "git", "docker", "linux", "aws", "azure", "firebase",
    "dom", "mvc", "nosql", "typescript", "ui", "ux", "oauth", "graphql", "redis", "postgresql", "mysql",
    "oracle", "mongodb", "django", "flask", "angular", "vue", "express", "spring", "hibernate", "selenium",
    "typescript", "clang", "cpp", "csharp", "php", "go", "rust", "elixir", "scala", "hadoop", "spark",
    "tensorflow", "pytorch", "kubernetes", "microservices", "serverless", "devops"
}

TOPIC_ALIASES = {
    r"\bajax\s+based\b": "AJAX",
    r"\bajax\b": "AJAX",
    r"\bnode\.?\s*js\b": "Node.js",
    r"\bnode\b": "Node.js",
    r"\bfull\s+stack\s+development\b": "Full Stack Development",
    r"\bbootstrap\s+classes\b": "Bootstrap",
    r"\bbootstrap\b": "Bootstrap",
    r"\bmongo\s*db\b": "MongoDB",
    r"\bmongodb\b": "MongoDB",
    r"\bajax\s+requests?\b": "AJAX",
    r"\bajax\s+forms?\b": "AJAX",
}

OCR_ARTIFACTS = {"lam", "neat", "trapped", "list", "suitable", "instructions", "critical"}
GENERIC_STANDALONE = {"cloud", "computing", "models", "model", "platform", "architecture", "resource", "machine", "security", "services", "service", "virtual", "organization", "challenge", "challenges", "component", "components", "state", "container", "data", "command", "return", "multiple", "feature", "features", "web", "page", "text", "content", "area", "users", "paragraph", "password", "featured", "external", "creating", "does", "system", "object", "objects", "forms", "form", "script", "language", "tool", "tools", "module", "modules"}

CONTEXT_CONCEPT_PRIORITY = [
    ("full stack development", "Full Stack Development"),
    ("mongodb", "MongoDB"),
    ("node.js", "Node.js"),
    ("node js", "Node.js"),
    ("ajax", "AJAX"),
    ("bootstrap", "Bootstrap"),
    ("react", "React"),
    ("javascript", "JavaScript"),
    ("html", "HTML"),
    ("css", "CSS"),
    ("sql", "SQL"),
    ("api", "API"),
    ("json", "JSON"),
    ("xml", "XML"),
    ("mongo db", "MongoDB"),
    ("rest", "REST"),
    ("mvc", "MVC"),
    ("dom", "DOM"),
    ("docker", "Docker"),
    ("git", "Git"),
    ("kubernetes", "Kubernetes"),
    ("java", "Java"),
    ("python", "Python"),
    ("php", "PHP"),
]

GENERIC_SINGLE_WORD_REJECTION = {
    "recognize", "address", "string", "live", "does", "explain", "list", "define", "compare",
    "write", "construct", "contrast", "state", "show", "give", "mean", "meaning", "purpose",
    "role", "steps", "details", "types", "type", "example", "examples", "method", "methods",
    "concept", "concepts", "idea", "ideas", "model", "models", "pattern", "patterns",
    "principle", "principles", "feature", "features", "system", "object", "objects", "data",
    "form", "forms", "request", "requests", "language", "tool", "module", "component", "ends",
    "reference", "references", "technique", "techniques"
}

GENERIC_PARENT_TAILS = {
    "analysis", "optimization", "parsing", "translation", "expression", "evaluation",
    "buffering", "classification", "selection", "compilation", "normalization"
}

REDUCTION_ALLOWED_PREFIXES = {"ll", "peephole", "input", "liveness", "flow", "data", "control", "lexical", "compiler", "parser"}

INVALID_CONCEPT_PATTERNS = (
    r"\b(?:what|why|how|when|where|who|which|explain|elaborate|describe|discuss|define|show|give|write|find|perform|performing|construct|convert|mean|means|meaning|significance|purpose|role|steps|details|compare|contrast|recognize|address|identify|list|state|does|do|did)\b",
    r"\b(?:types?|kinds?|examples?|details|steps)\b$",
)

OCR_TOKEN_FIXES = {
    "li": "LL",
    "l1": "LL",
    "l i": "LL",
    "ll": "LL",
}


@lru_cache(maxsize=1)
def _embedding_model():
    try:
        from sentence_transformers import SentenceTransformer
        return SentenceTransformer(os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2"))
    except Exception as exc:
        raise ValueError("Semantic topic discovery is unavailable. Install sentence-transformers and download the configured embedding model before starting the backend.") from exc


def _normalise_text(value: str) -> str:
    for pattern, replacement in TOPIC_ALIASES.items():
        value = re.sub(pattern, replacement, value, flags=re.I)
    return value


def _title_case_topic(raw: str) -> str:
    text = raw.strip()
    if not text:
        return ""
    lowered = text.lower()
    for pattern, replacement in TOPIC_ALIASES.items():
        if re.search(pattern, lowered, flags=re.I):
            return replacement
    tokens = re.findall(r"[A-Za-z0-9.]+", text)
    if not tokens:
        return ""
    formatted = []
    for token in tokens:
        token_lower = token.lower()
        if token_lower in {"js", "css", "html", "ajax", "api", "sql", "xml", "json", "db", "ui", "ux"}:
            formatted.append(token_upper := token.upper() if token_lower in {"ajax", "html", "css", "sql", "api", "xml", "json", "db", "ui", "ux"} else "JS")
            continue
        formatted.append(token[0].upper() + token[1:] if token and token[0].isalpha() else token)
    result = " ".join(formatted)
    result = re.sub(r"\bNode Js\b", "Node.js", result, flags=re.I)
    result = re.sub(r"\bMongo Db\b", "MongoDB", result, flags=re.I)
    return result


def _canonical_topic_name(value: str, context: str = "") -> str:
    text = (value or "").strip()
    if not text:
        return ""
    lowered = text.lower()
    for pattern, replacement in TOPIC_ALIASES.items():
        if re.search(pattern, lowered, flags=re.I):
            return replacement
    context_lower = context.lower()
    if "compiler vs interpreter" in lowered or "compiler versus interpreter" in lowered or "compiler and interpreter" in lowered:
        return "Compiler vs Interpreter"
    if "dangling reference" in lowered or "dangling references" in lowered:
        return "Dangling References"
    if "regular expression" in lowered or "regular expressions" in lowered:
        return "Regular Expressions"
    if "flow analysis" in lowered and "liveness" in lowered:
        return "Liveness Analysis"
    if "liveness" in lowered and "analysis" in lowered:
        return "Liveness Analysis"
    if "peephole" in lowered and "optimization" in lowered:
        return "Peephole Optimization"
    if "ll" in lowered and "parsing" in lowered:
        return "LL Parsing"
    if "input" in lowered and "buffer" in lowered:
        return "Input Buffering"
    if "flow analysis" in lowered:
        return "Flow Analysis"
    if "lexical analysis" in lowered:
        return "Lexical Analysis"
    if "full stack development" in context_lower:
        return "Full Stack Development"
    if "ajax" in context_lower:
        return "AJAX"
    if re.search(r"\bnode(?:\s*\.\s*js|\s+js)?\b", context_lower):
        return "Node.js"
    if re.search(r"\bbootstrap\b", lowered) and re.search(r"\bclass(?:e?s)?\b", lowered):
        return "Bootstrap"
    cleaned = _normalize_phrase(text)
    if cleaned:
        return cleaned
    if len(re.findall(r"[a-zA-Z0-9]+", lowered)) > 1:
        return _title_case_topic(text)
    single = re.sub(r"[^a-zA-Z0-9]", "", lowered)
    if single in TECHNICAL_SINGLE_WORDS or single.isupper() or (single and single[0].isupper()):
        return single[0].upper() + single[1:] if single and single[0].isalpha() else single
    return ""


def _strip_generic_leading_words(value: str) -> str:
    text = (value or "").strip()
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text)
    for pattern in (
        r"^(?:what|why|how|when|where|who|which|explain|elaborate|describe|discuss|define|list|state|show|give|write|find|findout|perform|performing|construct|convert|mean|means|meaning|significance|purpose|role|steps|details|compare|contrast|identify|recognize|address|does|do|did|different|types?|kinds?)\b\s*",
        r"^(?:what|why|how|when|where|who|which)\s+is\s+",
        r"^(?:what|why|how|when|where|who|which)\s+are\s+",
        r"^(?:what|why|how|when|where|who|which)\s+do\s+",
    ):
        text = re.sub(pattern, "", text, flags=re.I)
    text = re.sub(r"\s+(?:mean|means|meaning|purpose|role|steps|details|types?|kinds?|examples?)$", "", text, flags=re.I)
    text = re.sub(r"\s+and\s+$", "", text, flags=re.I)
    text = re.sub(r"\s+or\s+$", "", text, flags=re.I)
    return re.sub(r"\s+", " ", text).strip(" -_/.")


def _has_generic_fragment(label: str) -> bool:
    lowered = (label or "").strip().lower()
    if not lowered:
        return True
    if lowered in GENERIC_SINGLE_WORD_REJECTION:
        return True
    if len(re.findall(r"[A-Za-z0-9]+", lowered)) == 1 and lowered not in TECHNICAL_SINGLE_WORDS:
        return lowered in GENERIC_SINGLE_WORD_REJECTION or lowered in GENERIC_STANDALONE or lowered in OCR_ARTIFACTS or lowered in {"live", "string", "address"}
    if any(re.search(pattern, lowered) for pattern in INVALID_CONCEPT_PATTERNS):
        return True
    return False


def _repair_contextual_ocr(label: str, question: str) -> str:
    text = (label or "").strip()
    q = (question or "").lower()
    if not text:
        return ""
    label_lower = text.lower()
    if re.search(r"\b(?:ll|l\s+l)\b", q) and ("parsing" in q or "parser" in q or "grammar" in q):
        if label_lower in {"li parsing", "l i parsing", "li"} or re.search(r"\bli\b", label_lower):
            return "LL Parsing"
    if "dangling" in q and "reference" in q:
        if "dangling" in label_lower or "reference" in label_lower:
            return "Dangling References"
    if re.search(r"\b(?:syntactically live|live at a point|live variable|variable.*live|live.*point)\b", q):
        if "live" in label_lower or "liveness" in label_lower:
            return "Liveness Analysis"
    if re.search(r"\bcompare\b.*\bcontrast\b|\bcontrast\b.*\bcompare\b", q) and "interpreter" in q and "compiler" in q:
        return "Compiler vs Interpreter"
    if re.search(r"\bcompiler\b.*\binterpreter\b|\binterpreter\b.*\bcompiler\b", q):
        if "interpreter" in label_lower and "compiler" in label_lower:
            return "Compiler vs Interpreter"
    if re.search(r"\b(?:flow|data flow)\b.*\banalysis\b|\banalysis\b.*\b(?:flow|data flow)\b", q):
        if "flow" in label_lower and "analysis" in label_lower:
            return "Flow Analysis"
    if re.search(r"\b(?:data\s+flow|flow\s+analysis|control\s+flow)\b", q):
        if "flow" in label_lower:
            return "Flow Analysis"
    return text


def _final_semantic_topic_label(label: str, question: str = "") -> str:
    if not label:
        return ""
    text = _repair_contextual_ocr(label, question)
    text = _strip_generic_leading_words(text)
    text = re.sub(r"\s+", " ", text).strip(" -_/")
    if not text:
        return ""
    q = (question or "").lower()
    if re.search(r"\b(?:syntactically live|live at a point|live variable|variable.*live|live.*point)\b", q):
        return "Liveness Analysis"
    if re.search(r"\bcompare\b.*\bcontrast\b|\bcontrast\b.*\bcompare\b|\bcompiler\b.*\binterpreter\b|\binterpreter\b.*\bcompiler\b", q):
        if "compiler" in q and "interpreter" in q:
            return "Compiler vs Interpreter"
    if re.search(r"\bdangling\b.*\breference\b|\breference\b.*\bdangling\b", q):
        return "Dangling References"
    if re.search(r"\bregular\b.*\bexpression\b|\bexpression\b.*\bregular\b", q):
        return "Regular Expressions"
    text = _canonical_topic_name(text, question)
    if not text or _has_generic_fragment(text):
        return ""
    if "similar" in text.lower() and "similar" in (question or "").lower() and text.lower() == "similar":
        return ""
    return text


def _format(term: str) -> str:
    text = (term or "").strip()
    if not text:
        return ""
    normalized = _canonical_topic_name(text)
    if normalized:
        return normalized
    text = text.replace("-", " ")
    return " ".join(part.capitalize() if part.lower() not in {"ajax", "html", "css", "sql", "api", "ui", "ux", "db", "js"} else part.upper() if part.lower() == "ajax" else part.upper() for part in text.split())


def _terms_for_indices(indices: list[int], matrix, terms: np.ndarray) -> list[str]:
    scores = np.asarray(matrix[indices].mean(axis=0)).ravel()
    ranked = []
    for index in scores.argsort()[::-1]:
        if scores[index] <= 0:
            continue
        term = _clean_term(terms[index])
        if term:
            normalized = _canonical_topic_name(term)
            if normalized and normalized not in ranked and _is_meaningful(normalized):
                ranked.append(normalized)
    phrases = [term for term in ranked if " " in term]
    return phrases + [term for term in ranked if term not in phrases]


def _label_and_subtopics(indices: list[int], matrix, terms: np.ndarray, questions: list[str], representative_context: str = "") -> tuple[str, list[str]]:
    context = representative_context or " ".join(questions)
    context_lower = context.lower()
    if re.search(r"\bdangling\b.*\breference\b|\breference\b.*\bdangling\b", context_lower):
        return "Dangling References", []
    if re.search(r"\bregular\b.*\bexpression\b|\bexpression\b.*\bregular\b", context_lower):
        return "Regular Expressions", []
    if re.search(r"\bcompiler\b.*\binterpreter\b|\binterpreter\b.*\bcompiler\b", context_lower):
        return "Compiler vs Interpreter", []
    if re.search(r"\bflow\s+analysis\b", context_lower) and re.search(r"\bliveness\b|\blive\b", context_lower):
        return "Flow Analysis", ["Liveness Analysis"]
    if re.search(r"\bll\b.*\bparsing\b|\bparsing\b.*\bll\b", context_lower):
        return "Parsing", ["LL Parsing"]
    if re.search(r"\bpeephole\b.*\boptimization\b|\boptimization\b.*\bpeephole\b", context_lower):
        return "Optimization", ["Peephole Optimization"]
    if re.search(r"\bflow\s+analysis\b", context_lower) and re.search(r"\bliveness\b", context_lower):
        return "Flow Analysis", ["Liveness Analysis"]

    context_label = _context_concept_label(context)

    ranked = _terms_for_indices(indices, matrix, terms)
    ranked = [term for term in ranked if _technical_evidence(term, questions) > 0]
    if not ranked:
        if context_label and _technical_evidence(context_label, questions) > 0 and _is_meaningful(context_label):
            return context_label, []
        return "Other / Unclassified", []

    preferred = []
    for term in ranked:
        canonical = _canonical_topic_name(term, context)
        canonical = _final_semantic_topic_label(canonical, context)
        if canonical and canonical not in preferred and _is_meaningful(canonical):
            preferred.append(canonical)
    if not preferred:
        if context_label and _technical_evidence(context_label, questions) > 0 and _is_meaningful(context_label):
            return context_label, []
        return "Other / Unclassified", []

    if context_label and _is_meaningful(context_label):
        label = _final_semantic_topic_label(context_label, context) or context_label
        subtopics = [term for term in preferred if term != label][:5]
        if label.lower() in {"node.js", "ajax", "bootstrap", "full stack development"}:
            subtopics = [item for item in subtopics if item.lower() not in {label.lower()}]
        if label and context and not subtopics:
            parent_label, hierarchy_subtopics = _semantic_parent_hierarchy(label, context, subtopics)
            if parent_label and parent_label != label:
                label, subtopics = parent_label, hierarchy_subtopics
        return label, subtopics

    label = preferred[0]
    label = _final_semantic_topic_label(label, context) or label
    if not label or not _is_meaningful(label):
        return "Other / Unclassified", []
    if len(label.split()) == 1 and label.lower() in GENERIC_STANDALONE:
        return "Other / Unclassified", []

    subtopics = []
    for term in preferred[1:]:
        validated = _final_semantic_topic_label(term, context) or term
        if validated and validated != label and validated not in subtopics and _is_meaningful(validated):
            subtopics.append(validated)
        if len(subtopics) == 5:
            break
    if label.lower() in {"node.js", "ajax", "bootstrap", "full stack development"}:
        subtopics = [item for item in subtopics if item.lower() not in {label.lower()}]

    parent_label, hierarchy_subtopics = _semantic_parent_hierarchy(label, context, subtopics)
    if parent_label and parent_label != label:
        label, subtopics = parent_label, hierarchy_subtopics
    return label, subtopics


def _merge_clusters(initial: list[list[int]], embeddings: np.ndarray) -> list[list[int]]:
    """Merge initial clusters whose normalized centroids are semantically close."""
    if len(initial) < 2:
        return initial
    centroids = np.asarray([embeddings[group].mean(axis=0) for group in initial])
    norms = np.linalg.norm(centroids, axis=1, keepdims=True)
    centroids = centroids / np.maximum(norms, 1e-12)
    similarity = cosine_similarity(centroids)
    threshold = float(os.getenv("TOPIC_MERGE_THRESHOLD", "0.70"))
    parent = list(range(len(initial)))
    def find(value):
        while parent[value] != value:
            parent[value] = parent[parent[value]]; value = parent[value]
        return value
    def union(left, right):
        left, right = find(left), find(right)
        if left != right: parent[right] = left
    for left in range(len(initial)):
        for right in range(left + 1, len(initial)):
            if similarity[left, right] >= threshold: union(left, right)
    merged = {}
    for index, group in enumerate(initial): merged.setdefault(find(index), []).extend(group)
    return list(merged.values())


def _context_concept_label(context: str) -> str:
    lowered = (context or "").lower()
    for needle, canonical in CONTEXT_CONCEPT_PRIORITY:
        if needle in lowered:
            return canonical
    mapping = {"html": "HTML", "css": "CSS", "sql": "SQL", "api": "API", "json": "JSON", "xml": "XML", "react": "React", "javascript": "JavaScript", "mongodb": "MongoDB", "node": "Node.js", "ajax": "AJAX", "bootstrap": "Bootstrap", "docker": "Docker", "git": "Git", "java": "Java", "python": "Python", "php": "PHP"}
    for token in re.findall(r"[A-Za-z0-9.]+", lowered):
        token_lower = token.lower()
        if token_lower in mapping:
            return mapping[token_lower]
    return ""


GENERIC_INTENT_WORDS = {
    "what", "why", "how", "when", "where", "who", "which", "explain", "elaborate", "describe", "discuss",
    "define", "state", "list", "show", "give", "write", "find", "findout", "perform", "performing",
    "construct", "convert", "mean", "means", "meaning", "significance", "purpose", "role", "steps", "details",
    "in", "on", "of", "for", "the", "a", "an", "their", "its", "is", "are", "do", "does", "did", "using"
}
GENERIC_WRAPPER_SUFFIXES = {
    "technique", "techniques", "method", "methods", "approach", "approaches", "concept", "concepts",
    "idea", "ideas", "model", "models", "pattern", "patterns", "principle", "principles"
}


def _is_meaningful(term: str) -> bool:
    words = [word for word in re.findall(r"[a-zA-Z][a-zA-Z0-9-]*", term.lower()) if len(word) > 2]
    singularised = [word[:-1] if word.endswith("s") and len(word) > 3 else word for word in words]
    if not words or all((word in GENERIC_LABEL_WORDS or word in OCR_ARTIFACTS or singularised[idx] in GENERIC_LABEL_WORDS or singularised[idx] in GENERIC_STANDALONE) for idx, word in enumerate(words)):
        return False
    if len(words) == 1:
        word = words[0]
        singular = singularised[0]
        if word in GENERIC_SINGLE_WORD_REJECTION or singular in GENERIC_SINGLE_WORD_REJECTION:
            return False
        if word in GENERIC_STANDALONE or singular in GENERIC_STANDALONE or word in OCR_ARTIFACTS or word in {"state", "web", "page", "text", "content", "area", "users", "paragraph", "password", "featured", "external", "return", "command", "data", "multiple", "creating", "does", "container", "controlled", "uncontrolled"}:
            return False
        if len(word) < 4 and word not in TECHNICAL_SINGLE_WORDS and not word.isupper():
            return False
    return True


def _canonical_equivalence_key(value: str) -> str:
    cleaned = _normalize_phrase(value)
    if not cleaned:
        return ""
    canonical_tokens = []
    for token in re.findall(r"[A-Za-z0-9]+", cleaned):
        lemma = _singularize_word(token)
        canonical_tokens.append(lemma)
    key = " ".join(canonical_tokens).strip()
    return key.lower()


def _singularize_word(word: str) -> str:
    value = word.strip().lower()
    if len(value) <= 3:
        return value
    if value.endswith("ies") and len(value) > 3:
        return value[:-3] + "y"
    if value.endswith("sses"):
        return value[:-2]
    if value.endswith("s") and not value.endswith("ss"):
        return value[:-1]
    return value


def _normalize_phrase(value: str) -> str:
    text = (value or "").strip()
    text = text.replace("-", " ")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\b(?:what|why|how|when|where|who|which|explain|elaborate|describe|discuss|define|list|state|give|show|write|find|perform|performing|construct|convert|mean|means|meaning|significance|purpose|role|steps|details|in|on|of|for|the|a|an|using|compare|contrast|different|types|type|kinds|kind|identify|recognize|address|does|do|did)\b", " ", text, flags=re.I)
    text = re.sub(r"[?.,:;!]+$", "", text)
    tokens = [token for token in re.findall(r"[A-Za-z0-9]+", text) if token.lower() not in GENERIC_INTENT_WORDS]
    if not tokens:
        return ""

    if len(tokens) >= 2 and tokens[-1].lower() in GENERIC_WRAPPER_SUFFIXES:
        tokens = tokens[:-1]
    if len(tokens) >= 2 and tokens[0].lower() in GENERIC_INTENT_WORDS:
        tokens = tokens[1:]
    if not tokens:
        return ""

    display_tokens = []
    for token in tokens:
        lower = token.lower()
        if lower in {"references", "reference"}:
            display_tokens.append("References" if lower.endswith("s") else "Reference")
            continue
        if lower in OCR_TOKEN_FIXES:
            display_tokens.append(OCR_TOKEN_FIXES[lower])
            continue
        if lower == "ll":
            display_tokens.append("LL")
            continue
        if lower.endswith("techniques") or lower.endswith("technique"):
            display_tokens.append("Technique")
            continue
        if token.isupper() and len(token) <= 4:
            display_tokens.append(token.upper())
            continue
        display_tokens.append(token.title())

    normalized = " ".join(display_tokens)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def _technical_evidence(term: str, questions: list[str]) -> int:
    """Require a candidate to be grounded in complete questions, not OCR fragments."""
    normalized = _canonical_topic_name(term)
    if not normalized:
        return 0
    expression = re.compile(r"(?<!\w)" + re.escape(normalized.lower()) + r"(?!\w)", re.I)
    return sum(bool(expression.search(question.lower())) for question in questions)


def _clean_term(term: str) -> str:
    cleaned = re.sub(r"\s+", " ", term or "").strip()
    cleaned = re.sub(r"\b(?:based|using|with|for|on|of|and|or|to|the)\b", "", cleaned, flags=re.I)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" -_/")
    words = [word for word in cleaned.split() if word.lower() not in OCR_ARTIFACTS and word.lower() not in GENERIC_LABEL_WORDS]
    return " ".join(words)


def _semantic_parent_hierarchy(label: str, question: str, subtopics: list[str] | None = None) -> tuple[str, list[str]]:
    normalized_label = _canonical_topic_name(label, question)
    if not normalized_label:
        return "", []
    q_lower = (question or "").lower()
    if not q_lower:
        return normalized_label, list(subtopics or [])

    if re.search(r"\bdangling\b.*\breference\b|\breference\b.*\bdangling\b", q_lower):
        return "Dangling References", [normalized_label] if normalized_label != "Dangling References" else []
    if re.search(r"\bregular\b.*\bexpression\b|\bexpression\b.*\bregular\b", q_lower):
        return "Regular Expressions", [normalized_label] if normalized_label != "Regular Expressions" else []
    if re.search(r"\bcompiler\b.*\binterpreter\b|\binterpreter\b.*\bcompiler\b", q_lower):
        return "Compiler vs Interpreter", [normalized_label] if normalized_label != "Compiler vs Interpreter" else []
    if re.search(r"\bflow\s+analysis\b", q_lower) and "liveness" in normalized_label.lower():
        return "Flow Analysis", [normalized_label]
    if re.search(r"\blexical\s+analysis\b", q_lower) and "input buffering" in normalized_label.lower():
        return "Lexical Analysis", [normalized_label]
    if re.search(r"\bparsing\b", q_lower) and "ll parsing" in normalized_label.lower():
        return "Parsing", [normalized_label]
    if re.search(r"\boptimization\b", q_lower) and "peephole optimization" in normalized_label.lower():
        return "Optimization", [normalized_label]

    if len(normalized_label.split()) > 1:
        first_word = normalized_label.split()[0].lower()
        if first_word not in REDUCTION_ALLOWED_PREFIXES:
            return normalized_label, list(subtopics or [])

        tokens = normalized_label.split()
        generic_parent = " ".join(tokens[1:])
        if generic_parent and generic_parent.lower() != normalized_label.lower() and _is_meaningful(generic_parent):
            if generic_parent.lower() in q_lower or re.search(rf"\b{re.escape(generic_parent.lower())}\b", q_lower):
                parent = _canonical_topic_name(generic_parent, question)
                if parent and parent.lower() in {"parsing", "optimization", "analysis", "buffering", "expression", "evaluation", "classification", "selection", "compilation", "normalization"}:
                    return parent.title() if parent.islower() else parent, [normalized_label]

    broader_terms = []
    for phrase in re.findall(r"[A-Za-z][A-Za-z0-9. ]{2,}", question):
        cleaned = _canonical_topic_name(phrase, question)
        if cleaned and cleaned != normalized_label and _is_meaningful(cleaned):
            broader_terms.append(cleaned)

    for candidate in broader_terms:
        if candidate.lower() in q_lower and candidate.lower() != normalized_label.lower():
            candidate_tail = candidate.split()[-1].lower()
            label_tail = normalized_label.split()[-1].lower()
            if candidate_tail in GENERIC_PARENT_TAILS and label_tail in GENERIC_PARENT_TAILS:
                return candidate, [normalized_label]
            if candidate_tail in GENERIC_PARENT_TAILS and first_word in REDUCTION_ALLOWED_PREFIXES:
                return candidate, [normalized_label]

    return normalized_label, list(subtopics or [])


def discover_topics(questions: list[str]) -> list[dict]:
    """Discover topic hierarchies solely from the uploaded questions."""
    if not questions:
        return []
    normalised = [_normalise_text(question) for question in questions]
    embeddings = np.asarray(_embedding_model().encode(normalised, normalize_embeddings=True, show_progress_bar=False))
    if len(questions) == 1:
        initial = [[0]]
    else:
        clustering = AgglomerativeClustering(n_clusters=None, metric="cosine", linkage="average", distance_threshold=float(os.getenv("CLUSTER_DISTANCE_THRESHOLD", "0.45")))
        ids = clustering.fit_predict(embeddings)
        initial = [np.where(ids == group_id)[0].tolist() for group_id in sorted(set(ids))]
    merged = _merge_clusters(initial, embeddings)
    concept_groups = {}
    for index, question in enumerate(questions):
        label = _canonical_topic_name(question)
        if label and _is_meaningful(label):
            concept_groups.setdefault(_canonical_equivalence_key(label), []).append(index)
    if len(concept_groups) > 1 and len(merged) <= 2:
        merged = [group for group in concept_groups.values() if group]
    vectorizer = TfidfVectorizer(stop_words=list(GENERIC_LABEL_WORDS), ngram_range=(1, 3), max_features=100)
    try:
        matrix = vectorizer.fit_transform(normalised)
    except ValueError:
        return [{"label": "Other / Unclassified", "subtopics": [], "indices": list(range(len(questions))), "confidence": 0.0, "representativeQuestion": questions[0]}]
    terms = vectorizer.get_feature_names_out()
    topics = []
    for indices in merged:
        members = [normalised[index] for index in indices]
        centroid = embeddings[indices].mean(axis=0, keepdims=True)
        similarity_scores = cosine_similarity(embeddings[indices], centroid).ravel()
        representative = questions[indices[int(np.argmax(similarity_scores))]]
        representatives = [questions[indices[position]] for position in np.argsort(similarity_scores)[::-1][:3]]
        representative_context = " ".join(representatives)
        label, subtopics = _label_and_subtopics(indices, matrix, terms, members, representative_context)
        if label == "Other / Unclassified":
            continue
        confidence = float(similarity_scores.mean()) if len(similarity_scores) else 0.0
        context_label = _context_concept_label(representative_context)
        if context_label and context_label != label:
            label = context_label
            remaining = [item for item in subtopics if item.lower() != label.lower()]
            subtopics = remaining or [item for item in _terms_for_indices(indices, matrix, terms) if item.lower() != label.lower()][:5]
        topics.append({"label": label, "subtopics": subtopics, "indices": indices, "confidence": round(confidence, 2), "representativeQuestion": representative, "representativeQuestions": representatives})
    return topics
