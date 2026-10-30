const { extractDocument } = require("./pdfExtractor");
const { getCanonicalTopics } = require("./taxonomy");

const TOPIC_RULES = [
  { subject: "Cloud Computing", topic: "Cloud Service Models", patterns: [/\b(?:private|public|hybrid)\s+cloud\b|\b(?:iaas|paas|saas)\b|\bnist\b.*\bcloud/i] },
  { subject: "Cloud Computing", topic: "Cloud Security", patterns: [/\b(?:cloud|vm)\s+(?:security|security\s+challenges|data\s+security)|\biam\b|\bhyperjacking\b|\b(?:migration|resource)\s+attack/i] },
  { subject: "Cloud Computing", topic: "Cloud Platforms", patterns: [/\b(?:aws|amazon\s+web\s+services|openstack|eucalyptus)\b/i] },
  { subject: "Cloud Computing", topic: "Containers", patterns: [/\b(?:container|docker|containerization)\w*\b/i] },
  { subject: "Cloud Computing", topic: "Resource Provisioning", patterns: [/\b(?:cloud\s+)?resource\s+provisioning\b|\bprovisioning\s+methods?\b/i] },
  { subject: "Cloud Computing", topic: "Virtualization", patterns: [/\b(?:hypervisor|virtuali[sz]ation|virtual\s+machine|vmm|hyperjacking|vm\s+migration)\b/i] },
  { subject: "Cloud Computing", topic: "Distributed Computing", patterns: [/\b(?:distributed|cloud)\s+(?:and\s+)?(?:system|computing|model|architecture)\b/i] },
  { subject: "Compiler Design", topic: "Lexical Analysis", patterns: [/\blexical\s+analysis\b|\binput\s+buffering\b|\btoken(?:s|ization)?\b/i] },
  { subject: "Compiler Design", topic: "Parsing", patterns: [/\b(?:ll\s*\(?1\)?|slr|lr\s*\(?1\)?|shift[- ]reduce|parsing\s+table|parse(?:r|ing))\b/i] },
  { subject: "Compiler Design", topic: "Syntax Analysis", patterns: [/\bcontext[- ]free\s+grammar\b|\bcfg\b|\bsyntax\s+(?:directed|tree)|\bsyntax\s+analysis\b/i] },
  { subject: "Compiler Design", topic: "Code Generation", patterns: [/\bcode\s+generator\b|\bcode\s+generation\b|\bthree[- ]address\s+code\b/i] },
  { subject: "Compiler Design", topic: "Code Optimization", patterns: [/\b(?:code|peephole)\s+optimization\b|\bregister\s+allocation\b/i] },
  { subject: "Compiler Design", topic: "Data Flow Analysis", patterns: [/\b(?:data\s+flow|liveness|next\s+use|basic\s+block|flow\s+graph)\b/i] },
  { subject: "Compiler Design", topic: "Regular Expressions", patterns: [/\bregular\s+expression\b|\bsecurity\s+code\s+format\b/i] },
  { subject: "Full Stack Development", topic: "HTML", patterns: [/\bhtml\b|\bhtml5\b|\banchor\s+tag\b|\biframe\b/i] },
  { subject: "Full Stack Development", topic: "CSS", patterns: [/\bcss\b|\bbootstrap\b|\bbox\s+model\b|\btooltip\b/i] },
  { subject: "Full Stack Development", topic: "JavaScript", patterns: [/\bjavascript\b|\bjavascript\s+program\b|\bdom\b|\bes[356]\b/i] },
  { subject: "Full Stack Development", topic: "React.js", patterns: [/\breact(?:\s*js|\.js)?\b|\bjsx\b|\bvirtual\s+dom\b|\breact\s+hooks?\b/i] },
  { subject: "Full Stack Development", topic: "AJAX", patterns: [/\bajax\b/i] },
  { subject: "Full Stack Development", topic: "Node.js & Express", patterns: [/\bnode\s*\.?\s*js\b|\bexpress(?:\s+framework|js)?\b|\bnodemailer\b/i] },
  { subject: "Full Stack Development", topic: "MongoDB", patterns: [/\bmongo\s*db\b|\bnosql\b/i] },
  { subject: "Full Stack Development", topic: "SQL", patterns: [/\bsql\b|\bmysql\b|\bcrud\s+operations?\b/i] },
  { subject: "DSA", topic: "Hashing / Hash Tables", patterns: [/\b(?:hash(?:ing| table)|hashmap|collision resolution|load factor)\b/i] },
  { subject: "DSA", topic: "Dijkstra / Shortest Path", patterns: [/\bdijkstra(?:'s)?\b|\bshortest\s+paths?\b.*\b(?:non[- ]negative|weighted|edge)|\b(?:non[- ]negative|weighted)\b.*\bshortest\s+paths?\b/i] },
  { subject: "DSA", topic: "Binary Tree / BST", patterns: [/\bbinary\s+search\s+tree\b|\bbst\b/i] },
  { subject: "DSA", topic: "Binary Search", patterns: [/binary\s+search/i, /repeatedly\s+divides?\s+(?:the\s+)?search/i, /sorted\s+array.*(?:locate|find|search)/i] },
  { subject: "DSA", topic: "Binary Tree / BST", patterns: [/\bbinary\s+tree\b|\btree\b.*\b(?:root|child|leaf|traversal)\b|\b(?:root|child|leaf|traversal)\b.*\btree\b/i] },
  { subject: "DSA", topic: "Tree Traversal", patterns: [/\b(?:tree\s+traversal|inorder|preorder|postorder|level[- ]order)\b/i] },
  { subject: "DSA", topic: "BFS / Graph Traversal", patterns: [/\bbreadth[- ]first\s+search\b|\bbfs\b|\blevel[- ]by[- ]level\b|\bneighbors?\b.*\blevel/i] },
  { subject: "DSA", topic: "DFS / Graph Traversal", patterns: [/\bdepth[- ]first\s+search\b|\bdfs\b/i] },
  { subject: "DSA", topic: "Graphs", patterns: [/\b(?:graph traversal|graph representation|directed graph|adjacency matrix|adjacency list|edge represent)\b/i] },
  { subject: "DSA", topic: "Sorting / Selection Sort", patterns: [/\bselection\s+sort\b|\bselects?\s+(?:the\s+)?(?:minimum|smallest)\s+element/i] },
  { subject: "DSA", topic: "Sorting", patterns: [/\b(?:merge|quick|heap|insertion)\s+sort/i, /sorting\s+algorithm/i] },
  { subject: "DSA", topic: "Stack", patterns: [/\bstack\b|\bpush(?:ing)?\b|\bpop(?:ping)?\b/i] },
  { subject: "DSA", topic: "Queue", patterns: [/\bqueue\b|\benqueue\b|\bdequeue\b|\bfifo\b/i] },
  { subject: "DSA", topic: "Linked List", patterns: [/\blink(?:ed)?\s+lists?\b|\bnodes?\s+and\s+pointers?\b/i] },
  { subject: "Programming", topic: "Arrays", patterns: [/\barrays?\b|\btwo[- ]pointer|\bsliding\s+window\b/i] },
  { subject: "Programming", topic: "Strings", patterns: [/\bstring\b|\bsubstring\b/i] },
  { subject: "Programming", topic: "OOP / Inheritance", patterns: [/\b(?:inheritance|inherit|extends|subclass)\b|\bacquire(?:s)?\s+properties?.*\banother\s+class\b/i] },
  { subject: "Programming", topic: "OOP", patterns: [/\b(?:object[- ]oriented|polymorphism|encapsulation|class|interface)\b/i] },
  { subject: "Programming", topic: "Recursion", patterns: [/\brecursion|recursive|base\s+case\b/i] },
  { subject: "DBMS", topic: "SQL / Query Filtering", patterns: [/\bwhere\s+clause\b|\bfilter(?:s|ing)?\s+rows?.*before\s+group/i] },
  { subject: "DBMS", topic: "SQL", patterns: [/\b(?:sql|select\s+statement|join|group\s+by|query|relational\s+database)\b/i] },
  { subject: "DBMS", topic: "Database Normalization", patterns: [/\b(?:normalization|normal\s+form|functional\s+dependency|1nf|2nf|3nf|bcnf)\b/i] },
  { subject: "DBMS", topic: "Transactions", patterns: [/\b(?:transaction|acid|serializability|deadlock|commit|rollback)\b/i] },
  { subject: "Operating Systems", topic: "Virtualization", patterns: [/\b(?:virtualization|virtual\s+machine|hypervisor|containerization)\b/i] },
  { subject: "Operating Systems", topic: "Paging / Memory Management", patterns: [/\b(?:paging|page\s+replacement|page\s+table|fixed[- ]size\s+pages?)\b/i] },
  { subject: "Operating Systems", topic: "Memory Management", patterns: [/\b(?:memory\s+management|segmentation|virtual\s+memory|thrashing)\b/i] },
  { subject: "Operating Systems", topic: "Process Management", patterns: [/\b(?:process|thread|context\s+switch|synchronization|semaphore|mutex)\b/i] },
  { subject: "Operating Systems", topic: "Scheduling", patterns: [/\b(?:cpu\s+scheduling|round\s*robin|preemptive|scheduling\s+algorithm)\b/i] },
  { subject: "Computer Networks", topic: "Network Security", patterns: [/\b(?:network\s+security|encryption|firewall|authentication|tls|ssl|cybersecurity)\b/i] },
  { subject: "Computer Networks", topic: "HTTPS / Web Protocols", patterns: [/\bhttps?\b.*\b(?:secure|web\s+pages?|transfer)|\bsecurely\s+transfer\s+web\s+pages?\b/i] },
  { subject: "Computer Networks", topic: "Routing", patterns: [/\b(?:routing|router|distance\s+vector|link\s+state|ospf|rip)\b/i] },
  { subject: "Computer Networks", topic: "TCP/IP", patterns: [/\b(?:tcp|udp|ip\s+address|three[- ]way\s+handshake|http|dns)\b/i] },
  { subject: "Aptitude", topic: "Percentages", patterns: [/\b(?:percentage|percent|increase|decrease)\b/i, /%/] },
  { subject: "Aptitude", topic: "Profit & Loss", patterns: [/\b(?:profit|loss|cost\s+price|selling\s+price)\b/i] },
  { subject: "Aptitude", topic: "Time & Work", patterns: [/\b(?:time\s+and\s+work|work\s+and\s+time|work\s+rate|pipes?\s+and\s+cisterns?)\b/i] },
  { subject: "Aptitude", topic: "Speed & Distance", patterns: [/\b(?:speed|distance|average\s+speed|km\/h|km\s+per\s+hour)\b/i] },
  { subject: "Aptitude", topic: "Fractions", patterns: [/\bfraction|\d+\/\d+\b/i] },
  { subject: "Aptitude", topic: "Exponents & Logarithms", patterns: [/\b(?:indices?|exponent|power|logarithm|log\s*\d*)\b|\^/i] },
  { subject: "Aptitude", topic: "Number System", patterns: [/\b(?:number\s+system|prime|divisibility|remainder|lcm|hcf)\b/i] },
  { subject: "Aptitude", topic: "Logical Reasoning", patterns: [/\b(?:logical\s+reasoning|syllogism|seating\s+arrangement|blood\s+relation|series)\b/i] },
  { subject: "Aptitude", topic: "Verbal Ability", patterns: [/\b(?:synonym|antonym|grammar|reading\s+comprehension|vocabulary)\b/i] }
];

const DIFFICULTY_WEIGHTS = { Easy: 1, Medium: 2, Hard: 3 };
const PAGE_BREAK = "__OCR_PAGE_BREAK__";
const clean = (value) => String(value || "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();

const stripAnswerChoices = (value) => {
  const text = clean(value);
  const marker = text.search(/(?:^|\s)(?:\([A-D]\)|[A-D][.)\-:])\s+/);
  return clean(marker >= 0 ? text.slice(0, marker) : text);
};

const isQuestionPrompt = (value) => {
  const text = clean(value).replace(/^(?:\([a-z]\)|[a-z]\)|\(\d+\))\s*/i, "");
  return /\?|^(?:[0-9]+\s+)?(?:what|which|who|when|where|why|how|define|describe|explain|compare|differentiate|list|write|state|find|calculate|design|create|give|discuss|mention|illustrate|identify|derive|construct|consider|from|for|if|the|elaborate|convert|justify|discuss)\b/i.test(text)
    || /\b(?:question|program|application|statement|code|algorithm|architecture|technique|method|value|purpose|difference|steps?)\b/i.test(text)
    || text.length >= 24;
};

const isDocumentFurniture = (value) => {
  const text = clean(value);
  return !text
    || /^[-_|~. ]+$/.test(text)
    || /^(?:part|section)\s+[a-z0-9]/i.test(text)
    || /^(?:answer\s+all|all\s+questions|end\s+of\s+(?:the\s+)?question\s+paper|or)\b/i.test(text)
    || /^(?:page|p\.)\s*\d{1,4}(?:\s*(?:of|\/)\s*\d{1,4})?\b/i.test(text)
    || /^\d{1,3}\s+\d{3,6}$/.test(text)
    || /^(?:reg(?:istration)?\.?\s*(?:no|number)|question\s+paper\s+code|time\s*:|duration\s*:|maximum\s*(?:mark|marks)|date\s*:|marks?\b|unit\b|blooms?\b|level\b)/i.test(text)
    || /^(?:b\.?\s*e\.?|b\.?\s*tech|degree\s+examinations?|regulations?|information\s+technology|computer\s+science|university|college)\b/i.test(text)
    || /^placement\s+analysis\s+layout\s+test\s+page\s+\d+\b/i.test(text)
    || /^question\s+paper\s+(?:page|section)\b/i.test(text);
};

const isQuestionRangeLine = (value) => /^\s*(?:q(?:uestion)?\s*\.?\s*\d{1,4}\s*[–-]\s*q(?:uestion)?\s*\.?\s*\d{1,4}|q\.\d{1,4}\s*[–-]\s*q\.\d{1,4})\b/i.test(value);
const isCodeLine = (value) => /^(?:if\s+.*\bgoto\b|goto\b|return\b|break\b|printf\b|scanf\b|t\d+\s*=|[a-z_]\w*\s*=)/i.test(clean(value));

const getQuestionHeader = (line) => {
  const value = clean(line);
  if (!value || isQuestionRangeLine(value) || isDocumentFurniture(value)) return null;
  const named = value.match(/^\s*(?:question|ques)\s*#?\s*(\d{1,4})(?:\s*([.)\-:]))?\s*(.*)$/i);
  if (named) return { number: Number(named[1]), text: named[3] || "", explicit: true };
  const qStyle = value.match(/^\s*q\s*\.?\s*(\d{1,4})(?:\s*([.)\-:]))?\s*(.*)$/i);
  if (qStyle) return { number: Number(qStyle[1]), text: qStyle[3] || "", explicit: true };
  const numbered = value.match(/^\s*(\d{1,4})\s*([.)\-:])\s*(.*)$/);
  if (numbered && !isCodeLine(numbered[3])) return { number: Number(numbered[1]), text: numbered[3] || "", explicit: false };
  const bare = value.match(/^\s*(\d{1,3})\s+(.+)$/);
  if (bare && Number(bare[1]) <= 200 && isQuestionPrompt(bare[2])) return { number: Number(bare[1]), text: bare[2], explicit: false };
  return null;
};

const questionHeaderMatches = (line) => {
  const patterns = [
    /(?:^|\s)(?:(?:question|ques)\s*#?\s*|q\s*\.?\s*)(\d{1,4})(?:\s*[.)\-:]\s*|\s+(?=\S))/gi,
    /(?:^|\s)(\d{1,3})\s*[.)\-:]\s+/g
  ];
  return patterns.flatMap((pattern) => [...String(line || "").matchAll(pattern)].map((match) => ({
    start: match.index + (line[match.index] === " " ? 1 : 0),
    number: Number(match[1])
  }))).sort((left, right) => left.start - right.start).filter((match, index, all) => index === 0 || match.start !== all[index - 1].start);
};

const splitEmbeddedQuestionHeaders = (line) => {
  const matches = questionHeaderMatches(line);
  if (matches.length < 2) return [line];
  const parts = matches.map((match, index) => String(line).slice(match.start, matches[index + 1]?.start ?? line.length).trim());
  return parts.every((part) => {
    const header = getQuestionHeader(part);
    return header && (header.text.length > 0 || header.explicit);
  }) ? parts : [line];
};

const splitQuestions = (input) => {
  const text = String(input || "").replace(/\r\n?/g, "\n").trim();
  if (!text) return [];
  let lines = text.replace(/\f/g, `\n${PAGE_BREAK}\n`).split("\n").map(clean);
  const answerKeyIndex = lines.findIndex((line) => /^\s*(?:answer\s+key|correct\s+answers?|answers?|key)\s*(?::|\(|$)/i.test(line));
  if (answerKeyIndex >= 0) lines = lines.slice(0, answerKeyIndex);
  const furnitureCounts = new Map();
  lines.forEach((line) => {
    const key = clean(line).toLowerCase().replace(/\d+/g, "#");
    if (key) furnitureCounts.set(key, (furnitureCounts.get(key) || 0) + 1);
  });
  lines = lines
    .filter((line) => !/^\s*Question Bank Extraction Stress Test\b.*\bPage\s+\d+\s*$/i.test(line))
    .filter((line) => line === PAGE_BREAK || !isDocumentFurniture(line))
    .filter((line) => {
      const key = clean(line).toLowerCase().replace(/\d+/g, "#");
      return !(furnitureCounts.get(key) > 1 && /(?:college|university|degree examination|semester|regulation|information technology|question paper code|maximum|time\s*:)/i.test(line));
    })
    .flatMap((line) => line === PAGE_BREAK ? [line] : splitEmbeddedQuestionHeaders(line));
  const firstNumberedIndex = lines.findIndex((line) => line !== PAGE_BREAK && getQuestionHeader(line));
  if (firstNumberedIndex > 0) lines = lines.slice(firstNumberedIndex);
  const questions = [];
  let current = [];
  let lastQuestionNumber = 0;
  let pageBreakSinceQuestion = false;
  const flush = () => {
    const value = stripAnswerChoices(current.join(" "));
    if (value && !isDocumentFurniture(value) && isQuestionPrompt(value)) questions.push(value);
    current = [];
  };
  lines.forEach((line) => {
    if (line === PAGE_BREAK) {
      pageBreakSinceQuestion = true;
      return;
    }
    const header = getQuestionHeader(line);
    const startsQuestion = header && (!current.length || header.explicit || header.number > lastQuestionNumber || pageBreakSinceQuestion && header.number <= lastQuestionNumber);
    if (startsQuestion) {
      flush();
      if (header.text) current.push(header.text);
      lastQuestionNumber = header.number;
      pageBreakSinceQuestion = false;
    } else if (header && current.length) {
      current.push(line.trim());
    } else if (line.trim() && !isDocumentFurniture(line)) {
      current.push(line.trim());
    } else if (current.length) {
      flush();
    }
  });
  flush();
  return questions.length ? questions : text.split(/\n\s*\n+/).map(clean).filter((value) => value && !isDocumentFurniture(value));
};

const classifyTopic = (question) => {
  const questionText = stripAnswerChoices(question);
  const rule = TOPIC_RULES.find(({ patterns }) => patterns.some((pattern) => pattern.test(questionText)));
  if (rule) return normalizeTopicGroup({ subject: rule.subject, topic: rule.topic, confidence: "high" });
  if (/\b(?:code|program|function|algorithm|compile|runtime)\b/i.test(questionText)) return normalizeTopicGroup({ subject: "Programming", topic: "Programming Concepts", confidence: "medium" });
  if (/\b(?:calculate|find|what is the value|how many|equation)\b/i.test(questionText)) return normalizeTopicGroup({ subject: "Aptitude", topic: "Quantitative Aptitude", confidence: "medium" });
  return { subject: "General Technical", topic: "Technical Concepts", confidence: "low" };
};

const normalizeTopicGroup = (classification) => {
  const parentTopics = {
    "SQL / Query Filtering": "SQL",
    "Sorting / Selection Sort": "Sorting"
  };
  const parentTopic = parentTopics[classification.topic];
  return parentTopic
    ? { ...classification, topic: parentTopic, subtopic: classification.topic }
    : classification;
};

const classifyDifficulty = (question) => {
  const words = question.split(/\s+/).filter(Boolean).length;
  const signals = [
    /\b(?:compare|design|optimize|prove|analyze|deadlock|serializability|complexity|distributed|concurrent)\b/i,
    /\b(?:multiple|given|following)\b.*\b(?:steps?|conditions?|cases?)\b/i,
    /[{};]|```|\b(?:implement|write\s+(?:a|an)?\s*(?:program|function|query))\b/i
  ].filter((pattern) => pattern.test(question)).length;
  const advancedPrompt = /\b(?:design|optimize|prove|distributed|concurrent|complexity)\b/i.test(question);
  if (signals >= 2 || advancedPrompt && words > 10 || words > 42) return "Hard";
  if (signals === 1 || words > 20) return "Medium";
  return "Easy";
};

const priorityLabel = (score, maxScore) => {
  const ratio = maxScore ? score / maxScore : 0;
  if (ratio >= 0.82) return "Very High";
  if (ratio >= 0.6) return "High";
  if (ratio >= 0.38) return "Medium";
  return "Low";
};

const analyzeQuestions = (input) => {
  const questions = splitQuestions(input).map((question, index) => {
    const classification = classifyTopic(question);
    return { number: index + 1, question, ...classification, difficulty: classifyDifficulty(question) };
  });
  const groups = new Map();
  questions.forEach((question) => {
    const key = `${question.subject}::${question.topic}`;
    const group = groups.get(key) || { subject: question.subject, topic: question.topic, questions: [], difficulties: [] };
    group.questions.push(question);
    group.difficulties.push(question.difficulty);
    groups.set(key, group);
  });
  const maxRaw = Math.max(1, ...[...groups.values()].map((group) => group.questions.length * 4 + group.questions.reduce((sum, question) => sum + DIFFICULTY_WEIGHTS[question.difficulty], 0) + (group.questions.length > 1 ? 2 : 0)));
  const rankedTopics = [...groups.values()].map((group) => {
    const difficultyScore = group.difficulties.reduce((sum, difficulty) => sum + DIFFICULTY_WEIGHTS[difficulty], 0);
    const recurrenceBonus = group.questions.length > 1 ? 2 : 0;
    // Recurrence leads; difficulty and repeated concept evidence raise study priority without making frequency the only signal.
    const rawScore = group.questions.length * 4 + difficultyScore + recurrenceBonus;
    const averageDifficulty = group.difficulties.reduce((sum, difficulty) => sum + DIFFICULTY_WEIGHTS[difficulty], 0) / group.difficulties.length;
    return {
      subject: group.subject,
      topic: group.topic,
      questions: group.questions.length,
      difficulty: averageDifficulty >= 2.5 ? "Hard" : averageDifficulty >= 1.5 ? "Medium" : "Easy",
      score: rawScore,
      priority: priorityLabel(rawScore, maxRaw)
    };
  }).sort((left, right) => right.score - left.score || right.questions - left.questions || left.topic.localeCompare(right.topic));
  const difficultyDistribution = questions.reduce((result, question) => {
    result[question.difficulty] += 1;
    return result;
  }, { Easy: 0, Medium: 0, Hard: 0 });
  return {
    summary: { questionsAnalyzed: questions.length, topicsIdentified: rankedTopics.length },
    questions,
    topicFrequency: rankedTopics.map(({ subject, topic, questions: count }) => ({ subject, topic, count })),
    difficultyDistribution,
    rankedTopics: rankedTopics.map(({ score, ...topic }) => topic),
    studyOrder: rankedTopics.map(({ topic }) => topic)
  };
};

const analyzeUploadedFile = async (filePath, fileName) => {
  if (/\.txt$/i.test(fileName)) return { ...analyzeQuestions((await require("fs/promises").readFile(filePath)).toString("utf8")), source: { fileName, extractionMode: "text", pageCount: 1 } };
  if (/\.pdf$/i.test(fileName)) {
    const document = await extractDocument(filePath, fileName);
    return { ...analyzeQuestions(document.text), source: { fileName, extractionMode: document.extractionMode, pageCount: document.pageCount, warning: document.warning || "" } };
  }
  throw new Error("AI Mentor accepts pasted text, PDF, or TXT files.");
};

module.exports = { analyzeQuestions, analyzeUploadedFile, splitQuestions, classifyTopic, classifyDifficulty, getCanonicalTopics };
