const { getCanonicalTopics, normalizeTopic } = require("./taxonomy");
const { layoutLinesToText } = require("./pdfLayout");

const QUESTION_TYPES = ["MCQ"];
const OPTION_BASED_TYPES = new Set(["MCQ"]);
const INLINE_OPTION = /(?:^|(?<=\s))(?:\(([A-D])\)|([A-D])\s*[.)\-:|])\s*/gi;
const ANSWER_HEADING = /^\s*(?:(?:correct\s+)?answers?|answer\s*(?:key|keys)|key)(?:\s*\([^)]*\))?\s*:?[ \t]*$/i;
const ANSWER_HEADING_INLINE = /^\s*(?:(?:correct\s+)?answers?|answer\s*(?:key|keys)|key)\b(?:\s*\([^)]*\))?\s*:?[ \t]*/i;
const ANSWER_PAIR_PATTERNS = [
  /\bq(?:uestion)?\s*\.?\s*(\d{1,4})\s*(?:[-:.)|]\s*)?(?:option\s*)?\(?([A-E])\)?\b/gi,
  /(?:question\s*)?(\d{1,4})\s*(?:q\s*)?(?:[-:.)|]\s*|\s+)(?:option\s*)?\(?([A-E])\)?\b/gi,
  /(?:question\s*)?(\d{1,4})\s+(?:answer|option)\s*[:=\-]?\s*\(?([A-E])\)?\b/gi
];
const ANSWER_ENTRY = /(?:\bq(?:uestion)?\s*\.?\s*\d{1,4}\s*(?:[-:.)|]\s*)?(?:option\s*)?[A-E]\b|\b\d{1,4}\s*(?:[-:.)|]\s*|\s+)(?:option\s*)?[A-E]\b)/gi;

const FORMULA_REPAIRS = [
  ["Ã—", "×"], ["Ã·", "÷"], ["Â²", "²"], ["Â³", "³"], ["Â⁴", "⁴"],
  ["Â¹", "¹"], ["Â⁵", "⁵"], ["â¹", "¹"], ["â´", "⁴"], ["âµ", "⁵"], ["âˆš", "√"], ["âˆ›", "∛"], ["âˆ’", "−"], ["â‰¤", "≤"],
  ["â‰¥", "≥"], ["âˆž", "∞"], ["Ï€", "π"], ["Â±", "±"]
];
const SUPERSCRIPT_TO_ASCII = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-", "⁼": "=", "ⁿ": "n", "ⁱ": "i" };

const repairMojibake = (value) => FORMULA_REPAIRS.reduce((text, [broken, fixed]) => text.replaceAll(broken, fixed), String(value || ""));
const normalizeMathNotation = (value) => String(value || "")
  .replace(/([0-9A-Za-z𝑥𝑦𝑝𝑞𝑛)\]])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼ⁿⁱ]+)/g, (_, base, exponent) => `${base}^${exponent.split("").map((char) => SUPERSCRIPT_TO_ASCII[char] || char).join("")}`)
  .replace(/√\s+(?=[0-9A-Za-z(])/g, "√");

const cleanText = (value) => normalizeMathNotation(repairMojibake(value))
  .replace(/\u00a0/g, " ")
  .replace(/[ \t]+/g, " ")
  .trim();

const isQuestionRangeLine = (value) => /^\s*(?:q(?:uestion)?\s*[.]?\s*\d{1,4}\s*[–-]\s*q(?:uestion)?\s*[.]?\s*\d{1,4}|q\.\d{1,4}\s*[–-]\s*q\.\d{1,4})\b/i.test(value);
const isPageFurnitureLine = (value) => /^\s*(?:page\s+\d{1,4}|.+\s+page\s+\d{1,4})\s*$/i.test(value);

const getQuestionHeader = (line) => {
  const value = cleanText(line);
  if (!value || isQuestionRangeLine(value)) return null;
  const named = value.match(/^\s*(?:question|ques)\s*#?\s*(\d{1,4})\s*([.)\-:])\s*(.*)$/i);
  if (named) return { number: Number(named[1]), text: named[3] || "" };
  const qStyle = value.match(/^\s*q\s*[.]?\s*(\d{1,4})(?:\s*([.)\-:]))?\s*(.*)$/i);
  if (qStyle) return { number: Number(qStyle[1]), text: qStyle[3] || "" };
  const numbered = value.match(/^\s*(\d{1,4})\s*([.)\-:])\s*(.*)$/);
  return numbered && Number(numbered[1]) > 0 && numbered[3].trim() ? { number: Number(numbered[1]), text: numbered[3] } : null;
};

const splitInlineOptions = (value) => {
  const text = String(value || "");
  INLINE_OPTION.lastIndex = 0;
  const markers = [...text.matchAll(INLINE_OPTION)];
  if (!markers.length) return { question: text.trim(), options: [] };
  return {
    question: text.slice(0, markers[0].index).trim(),
    options: markers.map((marker, index) => ({
      letter: (marker[1] || marker[2]).toUpperCase(),
      text: text.slice(marker.index + marker[0].length, markers[index + 1]?.index ?? text.length).trim()
    }))
  };
};

const answerPairsFrom = (value) => {
  const pairs = [];
  for (const pattern of ANSWER_PAIR_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of String(value || "").matchAll(pattern)) pairs.push({ number: Number(match[1]), letter: match[2].toUpperCase() });
  }
  return pairs;
};

const isAnswerOnlyLine = (line) => {
  const value = cleanText(typeof line === "object" ? line.text : line);
  const pairs = answerPairsFrom(value);
  const remainder = value.replace(ANSWER_ENTRY, "").replace(/[,:;|()[\]{}\-]/g, "").trim();
  return pairs.length > 0 && !remainder;
};
const isAnswerEvidenceLine = (line) => {
  const value = cleanText(typeof line === "object" ? line.text : line);
  const pairs = answerPairsFrom(value);
  const distinctPairs = new Set(pairs.map(({ number, letter }) => `${number}-${letter}`));
  return isAnswerOnlyLine(line) || distinctPairs.size >= 2;
};

const findAnswerHeadingOffset = (line) => {
  const match = String(line || "").match(ANSWER_HEADING_INLINE);
  return match ? match.index : -1;
};

const extractAnswerKey = (rawText, allowedNumbers = null) => {
  const text = repairMojibake(rawText);
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const headingIndex = lines.findIndex((line) => findAnswerHeadingOffset(line) >= 0);
  const answerOnlyText = lines.filter(isAnswerOnlyLine).join("\n");
  const answerText = headingIndex >= 0
    ? [lines[headingIndex].slice(findAnswerHeadingOffset(lines[headingIndex])), ...lines.slice(headingIndex + 1)].join("\n")
    : answerOnlyText || (new Set(answerPairsFrom(text).map(({ number, letter }) => `${number}-${letter}`)).size >= 4 ? text : "");
  const mappings = new Map();
  answerPairsFrom(answerText).forEach(({ number, letter }) => {
    if (!allowedNumbers || allowedNumbers.has(number)) mappings.set(number, letter);
  });
  return { mappings, headingFound: headingIndex >= 0, sourceText: answerText };
};

const detectQuestionType = (question, options) => {
  if (options.length) return "MCQ";
  const marker = String(question || "").match(/^\s*(short[ -]?answer|brief answer|descriptive(?: answer)?|long[ -]?answer|coding(?: question| answer)?|programming(?: question| answer)?|aptitude(?: question)?|technical(?: question)?|hr(?: question)?)\s*[:\-]/i);
  if (!marker) return "";
  const value = marker[1].toLowerCase();
  if (value.includes("short") || value.includes("brief")) return "Short Answer";
  if (value.includes("descriptive")) return "Descriptive";
  if (value.includes("long")) return "Long Answer";
  if (value.includes("coding") || value.includes("programming")) return "Coding";
  if (value.includes("aptitude")) return "Aptitude";
  if (value.includes("technical")) return "Technical";
  return "HR";
};

const TOPIC_SIGNALS = {
  "Linked Lists, Stacks, Queues": [["fifo", 6], ["lifo", 6], ["queue", 5], ["stack", 5], ["enqueue", 6], ["dequeue", 6], ["linked list", 5]],
  "Sorting & Searching": [["binary search", 7], ["merge sort", 7], ["quick sort", 7], ["sorting", 4], ["sorted array", 5], ["search interval", 5]],
  HTML: [["html", 7], ["web page structure", 5], ["structure the content", 5], ["markup", 4], ["anchor tag", 5], ["semantic html", 7]],
  SELECT: [["select statement", 7], ["select command", 7], ["retrieve data", 6], ["retrieves data", 6], ["fetch records", 6], ["fetch rows", 6], ["selecting columns", 6]],
  "SQL Query Clauses": [["where clause", 7], ["having clause", 7], ["group by", 6], ["order by", 6], ["sql clause", 6], ["filter rows", 5]],
  "Machine Learning": [["supervised learning", 7], ["unsupervised learning", 7], ["machine learning", 6], ["classification", 5], ["regression", 5], ["clustering", 6], ["k means", 7], ["labeled data", 5]],
  "HTTP & REST": [["https", 7], ["http", 5], ["status code", 6], ["rest api", 7], ["http request", 6], ["http response", 6], ["securely transfer web pages", 7]],
  "Computer Architecture": [["cpu", 7], ["ram", 7], ["processor", 6], ["cache", 5], ["register", 5], ["executes instructions", 7], ["memory hierarchy", 6]],
  DBMS: [["normalization", 6], ["normal form", 7], ["partial dependency", 7], ["transitive dependency", 7], ["relational database", 5]],
  MongoDB: [["mongodb", 11], ["document database", 6], ["bson", 7], ["27017", 11]],
  "OOP in Java": [["java inheritance", 7], ["inherit a class", 7], ["inherits a class", 7], ["extends", 6], ["implements", 6], ["polymorphism", 5], ["encapsulation", 5], ["java class", 5]],
  "Python Fundamentals": [["python", 6], ["mutable", 5], ["immutable", 5], ["python data type", 7], ["python object", 6], ["python list", 6]],
  "Trees & Graphs": [["dijkstra", 8], ["shortest path", 7], ["weighted graph", 7], ["graph", 4], ["vertex", 5], ["tree traversal", 6]],
  "Hooks & State": [["react hook", 7], ["react", 4], ["usestate", 8], ["useeffect", 7], ["component state", 7]],
  "Software Engineering": [["sdlc", 8], ["requirements analysis", 8], ["system requirements", 7], ["software development lifecycle", 8], ["deployment", 4]],
  "Quantitative Aptitude Basics": [["percentage", 7], ["ratio", 7], ["proportion", 6], ["average", 6], ["number system", 7], ["probability", 8], ["profit", 6], ["loss", 6], ["simple interest", 8], ["compound interest", 8], ["exponent", 8], ["power", 5], ["superscript", 7], ["×", 5], ["÷", 5]],
  "Logical Reasoning": [["number series", 8], ["letter series", 8], ["sitting around", 7], ["circular table", 8], ["seating arrangement", 8], ["blood relation", 8], ["syllogism", 8], ["coding decoding", 8], ["direction", 5]],
  "Verbal Ability": [["synonym", 8], ["antonym", 8], ["grammatically correct", 8], ["grammar", 6], ["reading comprehension", 8], ["passage", 4]]
};

const SEMANTIC_TOPIC_RULES = [
  { candidates: ["Square Root", "Quantitative Aptitude Basics"], pattern: /(?:square\s+root|sqrt|√)\b/i },
  { candidates: ["Cube Root", "Quantitative Aptitude Basics"], pattern: /(?:cube\s+root|cuberoot|∛)\b/i },
  { candidates: ["MongoDB"], pattern: /\bmongodb\b|\b27017\b/i },
  { candidates: ["OOP in Java", "OOP"], pattern: /\bjava\b.*\b(?:inherit(?:ance)?|polymorphism|class|object)\b|\b(?:inherit(?:ance)?|polymorphism)\b.*\bjava\b/i },
  { candidates: ["SELECT", "SQL"], pattern: /\b(?:sql\s+)?(?:keyword|command|statement)\b.*\b(?:retriev|fetch|get)\w*\b.*\b(?:data|rows?|records?)\b/i },
  { candidates: ["SELECT", "SQL"], pattern: /\b(?:remove|eliminate)\b.*\bduplicate\s+(?:rows?|records?)\b|\bselect\s+distinct\b|\bdistinct\s+(?:rows?|records?)\b/i },
  { candidates: ["SQL Query Clauses", "SQL"], pattern: /\b(?:filter|filtering)\s+rows?\b.*\bbefore\s+group(?:ing|ed)?\b|\bwhere\s+clause\b/i },
  { candidates: ["Linked Lists, Stacks, Queues", "DSA"], pattern: /\bfifo\b|\bfirst\s+in\s+first\s+out\b/i },
  { candidates: ["Trees & Graphs", "DSA"], pattern: /\bshortest\s+path\b.*\bgraph\b|\bgraph\b.*\bshortest\s+path\b/i },
  { candidates: ["Number Series", "Logical Reasoning"], pattern: /\bnext\s+number\b.*\bseries\b|\bnumber\s+series\b/i },
  { candidates: ["Percentage", "Quantitative Aptitude Basics"], pattern: /\bpercentage\s+(?:increase|decrease)\b|\bpercentage\b/i }
];

const KEYWORD_TOPIC_RULES = [
  { candidates: ["SQL Query Clauses", "SQL"], pattern: /(?=.*\b(?:sql|table|query|clause|rows?|database)\b).*\b(?:where|group\s+by|having|order\s+by|join|filter\s+rows?)\b/i },
  { candidates: ["SELECT", "SQL"], pattern: /\bselect\s+(?:command|statement|keyword)\b|\bretrieve\b|\bfetch\b|\brows?\s+from\s+(?:a\s+)?table\b/i },
  { candidates: ["MongoDB"], pattern: /\bmongo\s*db\b|\bbson\b|\b27017\b/i },
  { candidates: ["Square Root", "Quantitative Aptitude Basics"], pattern: /\bsquare\s+root\b|\bsqrt\b|√/i },
  { candidates: ["Cube Root", "Quantitative Aptitude Basics"], pattern: /\bcube\s+root\b|\bcuberoot\b|∛/i },
  { candidates: ["Number Series", "Logical Reasoning"], pattern: /\bnumber\s+series\b|\bnext\s+number\b/i },
  { candidates: ["Percentage", "Quantitative Aptitude Basics"], pattern: /\bpercent(?:age)?\b|%/i },
  { candidates: ["Ratio & Proportion", "Quantitative Aptitude Basics"], pattern: /\bratio\b|\bproportion(?:al)?\b/i },
  { candidates: ["Profit & Loss", "Quantitative Aptitude Basics"], pattern: /\bprofit\b|\bloss\b/i },
  { candidates: ["Average", "Quantitative Aptitude Basics"], pattern: /\baverage\b|\bmean\b|\bmedian\b/i },
  { candidates: ["Simple Interest", "Quantitative Aptitude Basics"], pattern: /\bsimple\s+interest\b/i },
  { candidates: ["Compound Interest", "Quantitative Aptitude Basics"], pattern: /\bcompound\s+interest\b/i },
  { candidates: ["Probability", "Quantitative Aptitude Basics"], pattern: /\bprobability\b|\bprobable\b/i },
  { candidates: ["Permutation & Combination", "Quantitative Aptitude Basics"], pattern: /\bpermutation\b|\bcombination\b/i },
  { candidates: ["Algebra", "Quantitative Aptitude Basics"], pattern: /\balgebra\b|\bequation\b|\bunknown\s+variable\b/i },
  { candidates: ["Quantitative Aptitude Basics"], pattern: /\b(?:exponent|power|superscript)\b|[×÷]/i },
  { candidates: ["Python Development", "Python Fundamentals"], pattern: /\bpython\b/i },
  { candidates: ["Java Development", "OOP in Java"], pattern: /\bjava\b|\binheritance\b|\bpolymorphism\b/i },
  { candidates: ["JavaScript"], pattern: /\bjavascript\b|\bjs\b/i },
  { candidates: ["Sorting & Searching", "DSA"], pattern: /\bbinary\s+search\b|\bmerge\s+sort\b|\bquick\s+sort\b|\bsorting\b/i },
  { candidates: ["Trees & Graphs", "DSA"], pattern: /\bgraph\b|\bdijkstra\b|\bshortest\s+path\b/i },
  { candidates: ["Linked Lists, Stacks, Queues", "DSA"], pattern: /\blinked\s+list\b|\bstack\b|\bqueue\b/i }
];

const normalizeForClassification = (value) => cleanText(value).toLowerCase()
  .replace(/\^\s*([0-9]+)/g, " exponent $1 ")
  .replace(/[²³⁴⁵]/g, (char) => ({ "²": " exponent 2 ", "³": " exponent 3 ", "⁴": " exponent 4 ", "⁵": " exponent 5 " }[char]))
  .replace(/\s+/g, " ")
  .trim();

const resolveApprovedTopic = (candidates, approvedTopics) => candidates
  .map((candidate) => normalizeTopic(candidate))
  .find((topic) => topic && approvedTopics.includes(topic)) || "";

const classifyQuestion = (question, approvedTopics = getCanonicalTopics()) => {
  const text = normalizeForClassification(question);
  const semantic = SEMANTIC_TOPIC_RULES.find((rule) => rule.pattern.test(text));
  const semanticTopic = semantic && resolveApprovedTopic(semantic.candidates, approvedTopics);
  if (semanticTopic) return { topic: semanticTopic, topicConfidence: "high", classificationSource: "semantic" };

  const keyword = KEYWORD_TOPIC_RULES.find((rule) => rule.pattern.test(text));
  const keywordTopic = keyword && resolveApprovedTopic(keyword.candidates, approvedTopics);
  if (keywordTopic) return { topic: keywordTopic, topicConfidence: "high", classificationSource: "keyword" };

  const scores = Object.entries(TOPIC_SIGNALS)
    .map(([topic, signals]) => ({ topic: resolveApprovedTopic([topic], approvedTopics), score: signals.reduce((total, [signal, weight]) => total + (text.includes(signal) ? weight : 0), 0) }))
    .filter((entry) => entry.topic && entry.score > 0)
    .sort((left, right) => right.score - left.score);
  const best = scores[0];
  const runnerUp = scores[1];
  if (best && best.score >= 2) {
    return {
      topic: best.topic,
      topicConfidence: best.score >= 7 && (!runnerUp || best.score - runnerUp.score >= 2) ? "high" : "medium",
      classificationSource: "text"
    };
  }

  const fallback = /\d|[=+×÷√]|\b(?:calculate|evaluate|find the value|how much|what is the value)\b/i.test(text)
    ? resolveApprovedTopic(["Quantitative Aptitude Basics", "Aptitude"], approvedTopics)
    : "";
  return { topic: fallback, topicConfidence: "low", classificationSource: fallback ? "fallback" : "unclassified" };
};

const validateQuestion = (question, approvedTopics = getCanonicalTopics()) => {
  const normalized = { ...question, questionType: "MCQ", topic: normalizeTopic(question.topic) || String(question.topic || "").trim() };
  const reasons = [];
  if (!normalized.question?.trim()) reasons.push("Missing question text");
  if (!Array.isArray(normalized.options) || normalized.options.length !== 4 || normalized.options.some((option) => !String(option || "").trim())) reasons.push("MCQ requires exactly four non-empty options");
  if (!normalized.correctAnswer) reasons.push("Missing correct answer");
  if (normalized.correctAnswer && !normalized.options.includes(normalized.correctAnswer)) reasons.push("Correct answer does not match an option");
  return { ...normalized, reasons, valid: reasons.length === 0 };
};

const addContent = (current, value) => {
  const split = splitInlineOptions(value);
  if (split.options.length) {
    if (split.question) current.questionLines.push(cleanText(split.question));
    current.options.push(...split.options);
    current.activeOption = current.options[current.options.length - 1];
  } else if (current.activeOption) {
    current.activeOption.text = `${current.activeOption.text} ${cleanText(value)}`.trim();
  } else if (cleanText(value)) {
    current.questionLines.push(cleanText(value));
  }
};

const parseQuestionPaper = (rawText, sourcePaper = {}) => {
  const text = repairMojibake(rawText).replace(/\r\n?/g, "\n");
  const layoutLines = Array.isArray(sourcePaper.layoutLines) && sourcePaper.layoutLines.length ? layoutLinesToText(sourcePaper.layoutLines) : [];
  const repeatedLayoutText = new Set();
  if (layoutLines.length) {
    const occurrences = new Map();
    layoutLines.forEach((line) => {
      const key = cleanText(line.text).toLowerCase();
      if (!key) return;
      const pages = occurrences.get(key) || new Set();
      pages.add(line.page);
      occurrences.set(key, pages);
    });
    occurrences.forEach((pages, key) => { if (pages.size >= 3 && key.length < 80) repeatedLayoutText.add(key); });
  }
  const lines = (layoutLines.length ? layoutLines : text.split("\n").map((line) => ({ text: line })))
    .map((line) => ({ ...line, text: cleanText(line.text) }))
    .filter((line) => line.text && line.text !== "\f" && !repeatedLayoutText.has(line.text.toLowerCase()) && !isQuestionRangeLine(line.text) && !isPageFurnitureLine(line.text) && !/^page\s+\d+\s+of\s+\d+$/i.test(line.text) && !/^organizing institute:/i.test(line.text));
  const questions = [];
  const questionNumbers = new Set(lines
    .filter((line) => !isAnswerOnlyLine(line))
    .map((line) => getQuestionHeader(line.text)?.number)
    .filter(Boolean));
  const answerKey = extractAnswerKey(text, questionNumbers);
  let current = null;
  let answerKeyStarted = false;

  const finalize = () => {
    if (!current || !current.questionLines.length) return;
    const question = current.questionLines.join(" ").replace(/\s+/g, " ").trim();
    const orderedOptions = current.options.slice().sort((left, right) => left.letter.localeCompare(right.letter));
    const options = orderedOptions.map((option) => option.text.trim());
    const answerLetter = answerKey.mappings.get(current.number) || "";
    const answerIndex = answerLetter ? orderedOptions.findIndex((option) => option.letter === answerLetter) : -1;
    let classification = classifyQuestion(question);
    if (!classification.topic) classification = classifyQuestion(`${question} ${options.join(" ")}`);
    const { layoutLines: _layoutLines, ...paperMetadata } = sourcePaper;
    questions.push(validateQuestion({
      questionNumber: current.number,
      sourceNumber: current.number,
      question,
      options,
      correctOption: answerLetter,
      correctAnswer: answerIndex >= 0 ? options[answerIndex] : "",
      correctOptionText: answerIndex >= 0 ? options[answerIndex] : "",
      questionType: "MCQ",
      needsReview: !answerLetter || answerIndex < 0,
      ...classification,
      sourcePaper: { ...paperMetadata, questionNumber: current.number }
    }));
  };

  lines.forEach((line) => {
    if (answerKeyStarted) return;
    const answerHeadingOffset = findAnswerHeadingOffset(line.text);
    if (answerHeadingOffset >= 0) {
      const questionPrefix = cleanText(line.text.slice(0, answerHeadingOffset));
      if (questionPrefix && current) addContent(current, questionPrefix);
      answerKeyStarted = true;
      return;
    }
    if (current && current.options.length >= 4 && isAnswerEvidenceLine(line)) {
      answerKeyStarted = true;
      return;
    }
    const header = getQuestionHeader(line.text);
    if (header) {
      if (current && header.number <= current.number) {
        addContent(current, line.text);
        return;
      }
      finalize();
      current = { number: header.number, questionLines: [], options: [], activeOption: null };
      if (header.text) addContent(current, header.text);
      return;
    }
    if (!current || isAnswerOnlyLine(line)) return;
    addContent(current, line.text);
  });
  finalize();
  return { questions, answerKey: { entries: Object.fromEntries(answerKey.mappings), headingFound: answerKey.headingFound }, pageCount: Math.max(1, (text.match(/\f/g) || []).length + 1) };
};

module.exports = {
  OPTION_BASED_TYPES,
  QUESTION_TYPES,
  classifyQuestion,
  extractAnswerKey,
  parseQuestionPaper,
  repairMojibake,
  normalizeMathNotation,
  validateQuestion
};
