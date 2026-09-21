// Question validation chain
// Combines structural validation with domain-specific quality checks

const { validateGeneratedQuestion } = require("./generatedQuestionValidator");
const { validateJavaQuestion } = require("./javaQuestionQualityValidator");

const validationCallbacks = {
    onRejection: (payload) => {
        const { question, options = [], generatedMilestone, generatedTopic, requestedMilestone, requestedTopic, difficulty, reason, attempt } = payload || {};
        console.log(`[QUESTION_REJECTED] topic: ${requestedTopic || generatedTopic || "unknown"}, reason: ${reason}, attempt: ${attempt}`);
        console.log(`[REJECTED_QUESTION] ${JSON.stringify({
            question,
            options,
            generatedMilestone,
            generatedTopic,
            requestedMilestone,
            requestedTopic,
            difficulty,
            reason,
        }, null, 2)}`);
    },
    onAcceptance: (payload) => {
        const { milestone, topic, difficulty } = payload || {};
        console.log(`[QUESTION_ACCEPTED] milestone: ${milestone}, topic: ${topic}, difficulty: ${difficulty}`);
    },
};

const normalizeMilestoneKey = (value) => String(value || "").trim().toLowerCase();

// Use milestone-specific strong signals rather than broad vocabulary matching.
// This keeps the validation accurate without rejecting valid Java Basics questions that use common terms like method/class/String.
const MILESTONE_SCOPE_RULES = {
    "java basics": {
        positive: ["variable", "primitive", "reference type", "operator", "conditional statement", "loop", "for loop", "while loop", "array indexing", "method call", "main method", "scanner", "input output", "println", "type casting", "switch statement", "string builder", "string literal"],
        negative: ["arraylist", "linkedlist", "hashmap", "hashset", "inheritance", "polymorphism", "encapsulation", "abstraction", "extends", "implements", "interface", "spring", "spring boot", "jdbc", "sql", "hibernate", "entity", "repository", "controller", "restcontroller", "lambda", "stream api", "junit", "assert", "mockito"],
    },
    "oop in java": {
        positive: ["inheritance", "polymorphism", "encapsulation", "abstraction", "extends", "implements", "override", "overload", "constructor", "super", "this", "interface", "abstract class", "object hierarchy"],
        negative: ["arraylist", "linkedlist", "hashmap", "jdbc", "sql", "spring", "restcontroller", "thread", "synchronized", "executor", "lambda", "stream api", "try catch", "exception", "scanner", "printf"],
    },
    "collections framework": {
        positive: ["arraylist", "linkedlist", "hashset", "hashmap", "queue", "deque", "list", "set", "map", "collection", "iterator", "generic", "type parameter", "wildcard"],
        negative: ["inheritance", "polymorphism", "encapsulation", "interface", "extends", "implements", "spring", "jdbc", "sql", "thread", "synchronized", "executor", "lambda", "junit", "assert"],
    },
    "exception handling & i o": {
        positive: ["exception", "try", "catch", "finally", "throw", "throws", "checked exception", "unchecked exception", "error handling", "stack trace"],
        negative: ["arraylist", "hashmap", "inheritance", "polymorphism", "spring", "jdbc", "sql", "thread", "synchronized", "lambda", "repository"],
    },
    "multithreading & concurrency": {
        positive: ["thread", "runnable", "synchronized", "lock", "volatile", "executor", "deadlock", "race condition", "concurrent", "join", "sleep", "interrupt"],
        negative: ["arraylist", "hashmap", "inheritance", "polymorphism", "spring", "jdbc", "sql", "controller", "restcontroller", "repository", "assert", "junit"],
    },
    "jdbc & persistence": {
        positive: ["jdbc", "sql", "database", "connection", "statement", "preparedstatement", "resultset", "transaction", "entity", "repository", "persistence"],
        negative: ["arraylist", "hashmap", "inheritance", "polymorphism", "thread", "synchronized", "executor", "spring boot", "restcontroller", "lambda", "junit"],
    },
    "spring framework": {
        positive: ["spring", "dependency injection", "bean", "ioc", "applicationcontext", "autowired", "component", "service", "repository", "configuration"],
        negative: ["arraylist", "hashmap", "inheritance", "polymorphism", "thread", "executor", "jdbc", "sql", "lambda", "junit", "assert"],
    },
    "spring boot & rest apis": {
        positive: ["spring boot", "rest api", "controller", "restcontroller", "requestmapping", "getmapping", "postmapping", "responseentity", "http status", "json"],
        negative: ["arraylist", "hashmap", "inheritance", "polymorphism", "thread", "synchronized", "jdbc", "sql", "lambda", "assert", "junit"],
    },
    "testing & best practices": {
        positive: ["junit", "assert", "test", "mocking", "setup", "teardown", "unit test", "integration test", "best practice", "code quality"],
        negative: ["arraylist", "hashmap", "inheritance", "polymorphism", "spring", "jdbc", "sql", "thread", "synchronized", "lambda", "repository"],
    },
};

function validateMilestoneScope(candidate, context) {
    if (!context.milestone || !context.topic) {
        return { valid: true };
    }

    const requestedMilestone = normalizeMilestoneKey(context.milestone);
    const requestedTopic = normalizeMilestoneKey(context.topic);
    const rule = MILESTONE_SCOPE_RULES[requestedMilestone] || null;
    if (!rule) {
        return { valid: true };
    }

    const text = `${candidate.question || ""} ${candidate.explanation || ""} ${(candidate.options || []).join(" ")}`.toLowerCase();
    const normalizedText = text.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

    const hasPositiveSignal = rule.positive.some((term) => normalizedText.includes(term));
    const strongNegativeHits = rule.negative.filter((term) => normalizedText.includes(term));

    if (hasPositiveSignal) {
        return { valid: true };
    }

    if (strongNegativeHits.length >= 1) {
        return { valid: false, reason: `Question belongs to a different milestone, not "${context.milestone}"` };
    }

    return { valid: true };
}

async function validateQuestionChain(candidate, context, seenQuestions, attempt) {
    // Step 1: Structural validation
    const structuralValidation = validateGeneratedQuestion(candidate, context, seenQuestions);
    if (!structuralValidation.valid) {
        return { valid: false, reason: structuralValidation.reason };
    }

    // Step 2: Milestone scope validation
    const milestoneValidation = validateMilestoneScope(candidate, context);
    if (!milestoneValidation.valid) {
        return { valid: false, reason: milestoneValidation.reason };
    }

    // Step 3: Domain-specific validation (e.g., Java)
    if (context.domain === "Java Development") {
        const javaValidation = validateJavaQuestion(candidate, context);
        if (!javaValidation.valid) {
            return { valid: false, reason: javaValidation.reason };
        }
    }

    validationCallbacks.onAcceptance({
        milestone: candidate.milestone,
        topic: candidate.topic,
        difficulty: candidate.difficulty,
    });

    return structuralValidation;
}

// Attach callback for logging
validateQuestionChain.onRejection = validationCallbacks.onRejection;
validateQuestionChain.onAcceptance = validationCallbacks.onAcceptance;

module.exports = { validateQuestionChain, validationCallbacks };
