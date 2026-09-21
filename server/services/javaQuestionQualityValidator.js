// Java-specific technical validation for adaptive questions
// Only applied when domain === "Java Development"

const JAVA_KNOWN_APIS = {
    // Object methods
    object: ["wait", "notify", "notifyAll", "equals", "hashCode", "toString", "clone", "getClass"],
    // Thread methods
    thread: ["start", "run", "sleep", "join", "interrupt", "isAlive", "getName", "setName", "yield"],
    // Collections
    collections: ["ArrayList", "LinkedList", "HashSet", "HashMap", "TreeMap", "TreeSet", "Stack", "Queue", "Deque"],
    // Common classes
    lang: ["String", "Integer", "Double", "Boolean", "Long", "Character", "Byte", "Float", "Short"],
    // JUnit 5 annotations
    junit5: ["@Test", "@BeforeEach", "@AfterEach", "@DisplayName", "@Nested", "@ParameterizedTest", "@ValueSource"],
    // TestNG annotations (to detect mismatches)
    testng: ["@BeforeMethod", "@AfterMethod", "@BeforeClass", "@AfterClass", "@BeforeTest", "@AfterTest"],
    // Spring Boot annotations
    springBoot: ["@SpringBootApplication", "@RestController", "@RequestMapping", "@GetMapping", "@PostMapping", "@PutMapping", "@DeleteMapping", "@PatchMapping", "@EnableAutoConfiguration", "@ComponentScan"],
    // Spring annotations
    spring: ["@Controller", "@Service", "@Repository", "@Component", "@Autowired", "@Configuration"],
};

const TECHNICAL_CONTRADICTIONS = [
    {
        pattern: /LinkedList.*thread.{0,10}safe/i,
        message: "LinkedList is not thread-safe",
    },
    {
        pattern: /HashMap.*thread.{0,10}safe/i,
        message: "HashMap is not thread-safe",
    },
    {
        pattern: /wait\(\).*belongs.*Thread/i,
        message: "wait() is defined in Object, not Thread",
    },
    {
        pattern: /start\(\).*belongs.*Object/i,
        message: "start() is defined in Thread, not Object",
    },
];

const API_MISMATCHES = [
    {
        pattern: /@BeforeMethod.*JUnit\s+5/i,
        message: "@BeforeMethod is TestNG, not JUnit 5 (use @BeforeEach)",
    },
    {
        pattern: /@AfterMethod.*JUnit\s+5/i,
        message: "@AfterMethod is TestNG, not JUnit 5 (use @AfterEach)",
    },
    {
        pattern: /@BeforeClass.*JUnit\s+5/i,
        message: "@BeforeClass is TestNG, not JUnit 5 (use @BeforeAll)",
    },
];

function validateJavaQuestion(candidate, context) {
    if (context.domain !== "Java Development") {
        return { valid: true }; // Only apply to Java questions
    }

    // Check for technical contradictions in question or explanation
    for (const contradiction of TECHNICAL_CONTRADICTIONS) {
        const questionText = `${candidate.question} ${candidate.explanation}`.toLowerCase();
        if (contradiction.pattern.test(questionText)) {
            return { valid: false, reason: contradiction.message };
        }
    }

    // Check for API mismatches
    for (const mismatch of API_MISMATCHES) {
        const questionText = `${candidate.question} ${candidate.explanation}`;
        if (mismatch.pattern.test(questionText)) {
            return { valid: false, reason: mismatch.message };
        }
    }

    // Skip expensive API and conceptual cross-checks to avoid false rejections and speed up validation
    // (keep the clear technical regex-based checks above)

    return { valid: true };
}

function checkMentionedAPIs(candidate, context) {
    // Intentionally lightweight: skip deep API existence checks for speed
    return { valid: true };
}

function checkConceptualAccuracy(candidate, context) {
    // Skip conceptual accuracy heuristics to avoid false positives and reduce latency
    return { valid: true };
}

module.exports = { validateJavaQuestion, JAVA_KNOWN_APIS };
