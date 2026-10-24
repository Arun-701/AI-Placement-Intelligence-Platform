const fs = require("fs");
const path = require("path");

const JAVA_ROADMAP = (() => {
    try {
        const roadmapFile = path.join(__dirname, "../data/roadmaps.json");
        const roadmapData = JSON.parse(fs.readFileSync(roadmapFile, "utf8"));
        return roadmapData["java-development"] || { topics: [] };
    } catch (error) {
        return { topics: [] };
    }
})();

function getMilestoneBoundaryText(domain, milestone) {
    if (domain !== "Java Development") return "";

    const selectedTopic = JAVA_ROADMAP.topics.find((item) => item.title.toLowerCase() === String(milestone || "").toLowerCase());
    const description = selectedTopic?.description || "the selected Java milestone";
    const milestoneInstructions = {
        "Java Basics": "Focus on Java syntax, variables, primitive/reference data types, operators, type casting, control flow, loops, arrays, methods, basic input/output, and basic class/program structure. Avoid inheritance, polymorphism, interfaces, collections, generics, JDBC, Spring, REST, threads, and testing unless the milestone description explicitly includes them.",
        "OOP in Java": "Focus on inheritance, polymorphism, encapsulation, abstraction, classes, objects, interfaces, abstract classes, method overriding and overloading, constructors, and access control. Avoid collections, JDBC, Spring, REST APIs, thread synchronization, and testing as primary topics.",
        "Collections Framework": "Focus on lists, sets, maps, queues/deques, iterators, generics, collection APIs, and their common behaviors. Avoid core Java syntax basics, OOP design questions, Spring, JDBC, and thread/concurrency topics unless explicitly needed for the question.",
        "Exception Handling & I/O": "Focus on try/catch/finally, checked/unchecked exceptions, throwing, custom exceptions, and file/stream I/O. Avoid collections, OOP inheritance questions, JDBC, Spring, REST, and thread concurrency topics.",
        "Multithreading & Concurrency": "Focus on threads, Runnable, synchronization, locks, deadlocks, race conditions, join/sleep/interrupt, and concurrency APIs. Avoid basic syntax, collections, JDBC, Spring, and testing questions unless needed as a distractor.",
        "JDBC & Persistence": "Focus on JDBC, SQL, ResultSet, Statement/PreparedStatement, data access patterns, transactions, and persistence basics. Avoid collections, OOP theory, basic syntax, Spring Boot, and testing questions.",
        "Spring Framework": "Focus on dependency injection, beans, IoC, application context, component scanning, configuration, and Spring core concepts. Avoid basic Java syntax, collection APIs, JDBC details, REST endpoints, and testing-centric questions.",
        "Spring Boot & REST APIs": "Focus on Spring Boot wiring, REST endpoints, controllers, request mapping, HTTP methods, JSON, response handling, and API design. Avoid Java Basics syntax questions, collection data structure questions, JDBC persistence questions, and thread scheduling questions.",
        "Testing & Best Practices": "Focus on JUnit, assertions, unit testing, test setup/teardown, best practices, and code quality. Avoid Java syntax basics, collection APIs, OOP theory, JDBC, Spring Boot, and multithreading unless directly relevant to testing behavior.",
    };

    const specificInstruction = milestoneInstructions[String(milestone).trim()] || `Focus on the concepts described by the roadmap milestone: ${description}. Stay within this milestone and do not switch to other Java milestone topics.`;

    return `Milestone boundary: "${milestone}" — ${description}. ${specificInstruction}`;
}

const { validateGeneratedQuestion } = require("./generatedQuestionValidator");
const { validateQuestionChain } = require("./questionValidationChain");

const OLLAMA_BASE_URL = () => (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const OLLAMA_MODEL = () => process.env.OLLAMA_MODEL || "llama3.2:3b";
const TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 45000);
const MAX_GENERATION_ATTEMPTS = Number(process.env.MAX_GENERATION_ATTEMPTS || 3);

class LocalAiError extends Error {
    constructor(message, code = "GENERATION_FAILED", status = 502) { super(message); this.code = code; this.status = status; }
}

async function ollamaRequest(path, body, timeoutMs = TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(`${OLLAMA_BASE_URL()}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
        if (!response.ok) throw new LocalAiError("Local AI question generation service is unavailable. Please make sure Ollama is running.", "LOCAL_AI_UNAVAILABLE", 503);
        return await response.json();
    } catch (error) {
        if (error instanceof LocalAiError) throw error;
        throw new LocalAiError("Local AI question generation service is unavailable. Please make sure Ollama is running.", "LOCAL_AI_UNAVAILABLE", 503);
    } finally { clearTimeout(timer); }
}

async function checkOllamaHealth() {
    const response = await ollamaRequest("/api/show", { name: OLLAMA_MODEL() }, Math.min(TIMEOUT_MS, 8000));
    return Boolean(response);
}

function buildPrompt({ domain, milestone, topic, difficulty, rejectionReason = null, usedConceptsText = "" }) {
    const boundaryText = getMilestoneBoundaryText(domain, milestone);
    let basePrompt = `You are an expert technical assessment question generator specializing in ${domain}.

Generate exactly ONE high-quality multiple-choice question.

Context:
Domain: ${domain}
Milestone: ${milestone}
Topic: ${topic}
Difficulty: ${difficulty}

Milestone boundary:
${boundaryText}

CRITICAL QUALITY REQUIREMENTS:

1. EXACTLY ONE OBJECTIVELY CORRECT ANSWER
   - The correct answer must be technically unambiguous
   - All distractors must be clearly, objectively incorrect
   - No questions where multiple options could be considered correct
   - No vague wording like "Which is a characteristic of..." where all options are characteristics

2. TECHNICAL ACCURACY
   - Only use real APIs, classes, methods, annotations from ${domain}
   - Do not invent methods or classes that don't exist
   - Verify method ownership: wait() is in Object (not Thread), start() is in Thread
   - Verify framework versions: JUnit 5 uses @BeforeEach and @Test (not @BeforeMethod which is TestNG)
   - Do not claim LinkedList is thread-safe
   - Do not confuse Object methods with Thread methods
   - Do not mix frameworks (Spring, TestNG, JUnit) concepts

3. MILSTONE-SPECIFIC SCOPE
   - The generated question must stay inside the current milestone: ${milestone}
   - Use the milestone description above as the boundary
   - Do not switch to other Java milestones such as OOP, Collections, Spring, JDBC, testing, or multithreading unless the milestone itself explicitly includes those concepts
   - Keep the question text, answer, and distractors in scope for ${milestone}

4. NO AMBIGUOUS QUESTIONS
   - Avoid questions where all options are members of the same category
   - Example WRONG: "Which is an OOP feature?" Options: Inheritance, Polymorphism, Encapsulation, Abstraction
   - Example RIGHT: "Which keyword creates a subclass in Java?" Options: extends, implements, extends/implements mix, interface
   - All options must not be equally valid answers to the question

5. NO FALSE PREMISES
   - Do not include technically false statements in the question
   - Do not ask about features that contradict known behavior
   - Example WRONG: "LinkedList is thread-safe because..."
   - Example RIGHT: "What synchronization mechanism ensures thread-safety in collections?"

6. PREFER CONCRETE QUESTIONS
   - For easier difficulty: code snippets with output, API purpose, concrete scenarios
   - For harder difficulty: complex inheritance hierarchies, exception handling, design patterns
   - Avoid purely abstract/philosophical questions

7. CORRECT ANSWER MUST EXACTLY MATCH ONE OPTION
   - Do not use "A)", "B)", "C)", "D)" in correctAnswer
   - Do not use "Option A" in correctAnswer
   - correctAnswer must be the exact text from one of the four options

8. EXPLANATION MUST BE CLEAR
   - Explain why the correct answer is right
   - Briefly explain why main distractors are wrong (1-2 words each)
   - Minimum 12 characters

9. FORMAT
   - Exactly 4 options
   - All options unique
   - No "all of the above" or "none of the above"
   - No markdown formatting
   - Return JSON only with: domain, milestone, topic, difficulty, questionType="MCQ", question, options (array of 4 strings), correctAnswer (exact match to one option), explanation

IMPORTANT: The JSON must use these exact values:
{
  "domain": "${domain}",
  "milestone": "${milestone}",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "questionType": "MCQ"
}

Do not silently replace the requested milestone or topic with another Java topic.

RETURN JSON ONLY:
{
  "domain": "${domain}",
  "milestone": "${milestone}",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "questionType": "MCQ",
  "question": "...",
  "options": ["...", "...", "...", "..."],
  "correctAnswer": "...",
  "explanation": "..."
}`;

    if (rejectionReason) {
        basePrompt += `\n\nPREVIOUS ATTEMPT REJECTED:\nReason: ${rejectionReason}\n\nGenerate a COMPLETELY DIFFERENT question. Do not repeat the previous question structure or topic focus. Keep the question strictly inside ${milestone}.`;
    }

    if (usedConceptsText) {
        basePrompt += usedConceptsText + "\n\nGenerate a question about a DIFFERENT concept from those listed above.";
    }

    return basePrompt;
}

function buildBatchPrompt({ domain, milestone, topic, contexts }) {
     const difficultyListText = contexts.map(c => c.difficulty).join(", ");

     let basePrompt = `You are an expert programming exam question generator.

Generate exactly ${contexts.length} independent multiple-choice questions.

Return ONLY a valid JSON array.

No markdown.
No \`\`\`json.
No explanation outside JSON.
No extra text.

Context:
Domain: ${domain}
Milestone: ${milestone}
Topic: ${topic}
Difficulties (in order): ${difficultyListText}

Each object MUST be:

{
  "domain": "${domain}",
  "milestone": "${milestone}",
  "topic": "${topic}",
  "difficulty": "Easy|Medium|Hard",
  "questionType": "MCQ",
  "question": "...",
  "options": ["...", "...", "...", "..."],
  "correctAnswer": "...",
  "explanation": "..."
}

STRICT RULES:

1. Generate exactly ${contexts.length} questions.
2. Every question has EXACTLY 4 options.
3. Every option must be non-empty.
4. Every option must be different.
5. Exactly ONE option is correct.
6. correctAnswer must exactly match one option.
7. Do not use all-of-the-above.
8. Do not use none-of-the-above.
9. Do not repeat questions.
10. Do not repeat the same concept unnecessarily.
11. Stay strictly within the requested milestone: ${milestone}
12. Match the requested difficulty in order.
13. Questions must be factual and unambiguous.
14. Keep questions concise.
15. Before returning JSON, internally verify that every object has exactly 4 options and exactly one correct answer.
16. Return JSON only.`;

     return basePrompt;
}

async function generateBatchValidatedQuestions(contexts, seenQuestions) {
    if (!contexts || contexts.length === 0) return [];

    const startTime = Date.now();
    const milestone = contexts[0].milestone;
    const topic = contexts[0].topic;
    const domain = contexts[0].domain;

    const results = new Array(contexts.length);
    let pendingContexts = contexts.map((context, index) => ({
        ...context,
        batchIndex: index,
        attempts: 0
    }));

    // ONE batch attempt only
    console.log('[VALIDATION_MODE] essential');
    console.log(`[BATCH_GENERATION] milestone=${milestone} pending=${pendingContexts.length} target=${contexts.length}`);

    const prompt = buildBatchPrompt({ domain, milestone, topic, contexts: pendingContexts });
    const ollamaStart = Date.now();
    const response = await ollamaRequest(
        "/api/generate",
        {
            model: OLLAMA_MODEL(),
            prompt,
            stream: false,
            format: "json",
            keep_alive: "30m",
            temperature: 0.3,
            num_predict: Math.min(4096, 500 * pendingContexts.length)
        }
    );
    const ollamaTime = Date.now() - ollamaStart;

    let candidates;
    try {
        candidates = JSON.parse(response.response);
        if (!Array.isArray(candidates)) candidates = [candidates];
    } catch (err) {
        console.log(`[BATCH_GENERATION] Invalid JSON from Ollama, batch attempt failed`);
        candidates = [];
    }

    const nextPending = [];
    for (let i = 0; i < pendingContexts.length; i++) {
        const context = pendingContexts[i];
        const candidate = candidates[i];

        if (!candidate) {
            nextPending.push(context);
            console.log(`[BATCH_MISSING] index=${context.batchIndex} difficulty=${context.difficulty}`);
            continue;
        }

        const validated = await validateQuestionChain(candidate, context, seenQuestions, 1);
        if (validated.valid) {
            seenQuestions.add(validated.normalizedQuestion);
            results[context.batchIndex] = { ...validated.question, index: context.batchIndex, valid: true };
        } else {
            nextPending.push(context);
            console.log(`[QUESTION_REJECTED] index=${context.batchIndex} difficulty=${context.difficulty} reason=${validated.reason}`);
        }
    }

    const validCount = contexts.length - nextPending.length;
    console.log(`[BATCH_RESULT] valid=${validCount} pending=${nextPending.length}`);

    // Regenerate ONLY missing questions individually (max 2 attempts per missing question)
    if (nextPending.length > 0) {
        for (const context of nextPending) {
            try {
                console.log(`[INDIVIDUAL_RETRY] index=${context.batchIndex} difficulty=${context.difficulty} attempt=1`);
                
                // Build list of used concepts to avoid duplication
                const usedConcepts = Array.from(seenQuestions).slice(-5); // Keep last 5 for context
                const usedConceptsText = usedConcepts.length > 0 
                    ? `\n\nAVOID these already-used question concepts:\n${usedConcepts.join("\n")}`
                    : "";
                
                const singleQuestion = await generateValidatedQuestion(context, seenQuestions, usedConceptsText);
                results[context.batchIndex] = { ...singleQuestion, index: context.batchIndex, valid: true };
                console.log(`[QUESTION_ACCEPTED] index=${context.batchIndex} difficulty=${context.difficulty}`);
            } catch (error) {
                console.log(`[INDIVIDUAL_RETRY] index=${context.batchIndex} difficulty=${context.difficulty} attempt=2`);
                try {
                    // Second attempt
                    const usedConcepts = Array.from(seenQuestions).slice(-5);
                    const usedConceptsText = usedConcepts.length > 0 
                        ? `\n\nAVOID these already-used question concepts:\n${usedConcepts.join("\n")}`
                        : "";
                    
                    const singleQuestion = await generateValidatedQuestion(context, seenQuestions, usedConceptsText);
                    results[context.batchIndex] = { ...singleQuestion, index: context.batchIndex, valid: true };
                    console.log(`[QUESTION_ACCEPTED] index=${context.batchIndex} difficulty=${context.difficulty}`);
                } catch (secondError) {
                    console.log(`[QUESTION_GENERATION_FAILED] index=${context.batchIndex} difficulty=${context.difficulty}`);
                    throw new LocalAiError(`Failed to generate valid question for ${context.difficulty} difficulty after 2 attempts.`, "GENERATION_FAILED", 422);
                }
            }
        }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[PERF] milestone=${milestone} batchSize=${contexts.length} ollamaMs=${ollamaTime} totalMs=${totalTime}`);
    console.log(`[GENERATION_COMPLETE] milestone=${milestone} questionsGenerated=${contexts.length}`);

    // Final safety check
    const finalResults = results.filter(Boolean);
    if (finalResults.length !== contexts.length) {
        throw new LocalAiError(
            `Generated ${finalResults.length} questions, but ${contexts.length} were required.`,
            "GENERATION_COUNT_MISMATCH",
            422
        );
    }

    return finalResults;
}

async function generateValidatedQuestion(context, seenQuestions, usedConceptsText = "") {
    const startTime = Date.now();
    // MAX 2 ATTEMPTS for individual question
    for (let attempt = 1; attempt <= 2; attempt += 1) {
        const prompt = buildPrompt({ ...context, rejectionReason: context.lastRejectionReason, usedConceptsText });
        const ollamaStart = Date.now();
        const response = await ollamaRequest("/api/generate", { 
            model: OLLAMA_MODEL(), 
            prompt, 
            stream: false, 
            format: "json" 
        });
        const ollamaTime = Date.now() - ollamaStart;
        
        let candidate;
        try { 
            candidate = JSON.parse(response.response); 
        } catch { 
            if (attempt < 2) continue;
            else throw new LocalAiError("Invalid JSON response from Ollama", "GENERATION_FAILED", 422);
        }
        
        const validated = await validateQuestionChain(candidate, context, seenQuestions, attempt);
        if (validated.valid) { 
            seenQuestions.add(validated.normalizedQuestion);
            const totalTime = Date.now() - startTime;
            console.log(`[PERF] milestone=${context.milestone} difficulty=${context.difficulty} ollamaMs=${ollamaTime} totalMs=${totalTime}`);
            return validated.question; 
        }
        
        context.lastRejectionReason = validated.reason || "Question quality validation failed";
        console.log(`[INDIVIDUAL_ATTEMPT_REJECTED] difficulty=${context.difficulty} attempt=${attempt} reason=${validated.reason}`);
    }
    
    // After 2 attempts, throw error
    throw new LocalAiError("Local AI could not produce a valid question after 2 attempts.", "GENERATION_FAILED", 422);
}

module.exports = { checkOllamaHealth, generateValidatedQuestion, generateBatchValidatedQuestions, LocalAiError, MAX_GENERATION_ATTEMPTS };
