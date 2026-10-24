const normalizeQuestionText = (value) => String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeOptionForDuplicateCheck = (value) => normalizeQuestionText(String(value || "")).replace(/\s+/g, " ").trim();

const hasOptionPrefix = (value) => /^\s*(?:[a-d][).:]|option\s*[a-d]\b)/i.test(String(value || ""));
const bannedOption = (value) => /^\s*(?:all|none)\s+of\s+the\s+above\s*$/i.test(String(value || ""));
const isVagueConceptual = (question) => /^\s*which\s+(?:is|are)\s+(?:an?|the)\s+(?:characteristic|advantage|feature|property|component|aspect|element)\s+of/i.test(String(question || ""));

function validateGeneratedQuestion(candidate, context, seenQuestions = new Set()) {
    // Essential structural checks only
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return { valid: false, reason: "Question is not a JSON object" };
    const required = ["domain", "milestone", "topic", "difficulty", "questionType", "question", "options", "correctAnswer", "explanation"];
    if (required.some((field) => candidate[field] === undefined || candidate[field] === null)) return { valid: false, reason: "Question is missing required fields" };
    if (candidate.domain !== context.domain || candidate.milestone !== context.milestone || candidate.topic !== context.topic) return { valid: false, reason: "Question context does not match the requested roadmap milestone" };
    if (candidate.difficulty !== context.difficulty || !["Easy", "Medium", "Hard"].includes(candidate.difficulty)) return { valid: false, reason: "Question difficulty is invalid" };
    if (candidate.questionType !== "MCQ" || typeof candidate.question !== "string" || !candidate.question.trim()) return { valid: false, reason: "Question must be a non-empty MCQ" };
    if (!Array.isArray(candidate.options) || candidate.options.length !== 4 || candidate.options.some((option) => typeof option !== "string" || !option.trim())) return { valid: false, reason: "Question must contain exactly four non-empty options" };
    const normalizedOptions = candidate.options.map((option) => option.trim());
    // Distinct options (trimmed strings)
    if (new Set(normalizedOptions).size !== 4) return { valid: false, reason: "Question options are duplicated" };
    // Disallow blatant banned options
    if (candidate.options.some((option) => bannedOption(option))) return { valid: false, reason: "Question contains banned option text (all/none of the above)" };
    if (typeof candidate.correctAnswer !== "string" || !candidate.options.includes(candidate.correctAnswer)) return { valid: false, reason: "correctAnswer must exactly match one option" };
    if (typeof candidate.explanation !== "string" || !candidate.explanation.trim()) return { valid: false, reason: "Question explanation is missing" };
    const normalizedQuestion = normalizeQuestionText(candidate.question);
    if (!normalizedQuestion) return { valid: false, reason: "Question text is empty after normalization" };
    if (seenQuestions.has(normalizedQuestion)) return { valid: false, reason: "Duplicate generated question" };

    // Keep lighter-weight quality checks only (no semantic similarity)
    return { valid: true, question: { ...candidate, question: candidate.question.trim(), options: normalizedOptions, explanation: candidate.explanation.trim() }, normalizedQuestion };
}

module.exports = { validateGeneratedQuestion, normalizeQuestionText };
