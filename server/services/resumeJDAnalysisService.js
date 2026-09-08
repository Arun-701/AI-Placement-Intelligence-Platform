const fs = require("fs").promises;
const path = require("path");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");
const { pipeline } = require("@huggingface/transformers");

const LOCAL_EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
let embeddingPipelinePromise;

const getEmbeddingPipeline = () => {
    if (!embeddingPipelinePromise) {
        embeddingPipelinePromise = pipeline("feature-extraction", LOCAL_EMBEDDING_MODEL);
    }
    return embeddingPipelinePromise;
};

const cosineSimilarity = (left, right) => {
    let dot = 0;
    let leftMagnitude = 0;
    let rightMagnitude = 0;

    for (let index = 0; index < left.length; index += 1) {
        dot += left[index] * right[index];
        leftMagnitude += left[index] ** 2;
        rightMagnitude += right[index] ** 2;
    }

    if (!leftMagnitude || !rightMagnitude) return 0;
    return Math.max(0, Math.min(1, dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude))));
};

const calculateSemanticSimilarity = async (resumeText, jdText) => {
    const extractor = await getEmbeddingPipeline();
    const [resumeEmbedding, jdEmbedding] = await Promise.all([
        extractor(resumeText.slice(0, 6000), { pooling: "mean", normalize: true }),
        extractor(jdText.slice(0, 6000), { pooling: "mean", normalize: true })
    ]);

    return cosineSimilarity(Array.from(resumeEmbedding.data), Array.from(jdEmbedding.data));
};

const extractTextFromPDF = async (fileBuffer) => {
    try {
        const header = fileBuffer.slice(0, 4).toString("utf8");
        if (header !== "%PDF") {
            throw new Error("Uploaded file is not a valid PDF");
        }

        const parser = new PDFParse({ data: fileBuffer });
        const pdfData = await parser.getText();
        const extractedText = pdfData?.text?.trim();
        await parser.destroy();

        if (!extractedText) {
            throw new Error("No selectable text found in PDF");
        }

        return extractedText;
    } catch (error) {
        if (error.message.includes("not a valid PDF") || error.message.includes("No selectable text")) {
            throw error;
        }
        throw new Error("Unable to extract text from PDF");
    }
};

const extractTextFromDOCX = async (fileBuffer) => {
    try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        const text = result.value?.trim();

        if (!text) {
            throw new Error("No text found in DOCX file");
        }

        return text;
    } catch (error) {
        if (error.message.includes("No text found")) {
            throw error;
        }
        throw new Error("Unable to extract text from DOCX");
    }
};

const extractTextFromFile = async (fileBuffer, mimeType) => {
    if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error("File is empty");
    }

    if (mimeType.includes("pdf")) {
        return extractTextFromPDF(fileBuffer);
    } else if (mimeType.includes("word") || mimeType.includes("docx")) {
        return extractTextFromDOCX(fileBuffer);
    } else if (mimeType === "text/plain") {
        return fileBuffer.toString("utf8").trim();
    } else {
        throw new Error("Unsupported file type. Use PDF, DOCX, or TXT");
    }
};

const cleanText = (text) => {
    return text
        .replace(/\s+/g, " ")
        .replace(/[^\w\s.,;:\-()@/+#]/g, "")
        .trim();
};

const parseAIAnalysisResponse = (responseText) => {
    const trimmedText = String(responseText || "").trim();
    const jsonStart = trimmedText.indexOf("{");
    const jsonEnd = trimmedText.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        throw new Error("Invalid AI response format");
    }

    const jsonText = trimmedText.slice(jsonStart, jsonEnd + 1);

    try {
        return JSON.parse(jsonText);
    } catch (error) {
        throw new Error("Failed to parse AI response");
    }
};

const calculateBasicATSScore = (resumeText, jdText) => {
    // Normalize texts
    const resumeLower = resumeText.toLowerCase();
    const jdLower = jdText.toLowerCase();

    // Extract key sections
    const contactMatch = resumeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const phoneMatch = resumeText.match(/(\+?\d[\d\s\-().]{7,}\d)/);

    let score = 100;
    const issues = [];

    // Contact info check
    if (!contactMatch) {
        score -= 15;
        issues.push("Missing email address");
    }
    if (!phoneMatch) {
        score -= 10;
        issues.push("Missing phone number");
    }

    // Keywords from JD
    const jdKeywords = jdText.match(/\b[a-z]{4,}\b/gi) || [];
    const uniqueJDKeywords = new Set(jdKeywords.map((k) => k.toLowerCase()));
    let keywordMatches = 0;

    uniqueJDKeywords.forEach((keyword) => {
        if (resumeLower.includes(keyword)) {
            keywordMatches++;
        }
    });

    const keywordMatchPercentage = (keywordMatches / Math.max(uniqueJDKeywords.size, 1)) * 100;
    if (keywordMatchPercentage < 30) {
        score -= 25;
        issues.push("Low keyword match with job description");
    } else if (keywordMatchPercentage < 50) {
        score -= 15;
        issues.push("Moderate keyword match with job description");
    }

    // Structure check
    const hasEducation = /education|academic|degree|university|college|institute/i.test(resumeText);
    const hasExperience = /experience|internship|project|work|role|position/i.test(resumeText);
    const hasSkills = /skills|technical|technology|proficiency|languages/i.test(resumeText);

    if (!hasEducation) {
        score -= 10;
        issues.push("Missing education section");
    }
    if (!hasExperience) {
        score -= 15;
        issues.push("Missing experience or projects section");
    }
    if (!hasSkills) {
        score -= 10;
        issues.push("Missing skills section");
    }

    // Length check
    if (resumeText.length < 300) {
        score -= 10;
        issues.push("Resume is too short");
    }

    score = Math.max(0, Math.min(100, score));

    return {
        score: Math.round(score),
        keywordMatchPercentage: Math.round(keywordMatchPercentage),
        issues,
    };
};

const analyzeResumeAgainstJDLegacy = async (resumeText, jdText) => {
    const resumeClean = cleanText(resumeText);
    const jdClean = cleanText(jdText);

    console.log("[Service] analyzeResumeAgainstJD called");
    console.log("[Service] Resume text length:", resumeClean.length);
    console.log("[Service] JD text length:", jdClean.length);

    const prompt = `You are an expert resume analyzer and career counselor. Your task is to provide a comprehensive, semantic analysis of a resume against a specific job description.

IMPORTANT: Consider the MEANING and CONTEXT of the resume and JD, not just exact keyword matches. Identify equivalent skills even if they use different terminology.

Resume:
${resumeClean.substring(0, 3000)}

Job Description:
${jdClean.substring(0, 2000)}

Provide ONLY a valid JSON response (no markdown, no explanations) following this exact schema:

{
  "atsScore": <0-100 integer>,
  "jobMatchScore": <0-100 integer>,
  "matchLevel": "<Excellent Match|Strong Match|Moderate Match|Weak Match>",
  "summary": "<2-3 sentence summary of the fit>",
  "matchedSkills": [<skill required in JD that is demonstrated in resume>],
  "missingSkills": {
    "required": [<explicitly required but missing>],
    "preferred": [<preferred but missing>]
  },
  "matchedKeywords": [<JD keywords present in resume>],
  "missingKeywords": [<important JD keywords not in resume>],
  "partialKeywords": [<keywords partially matched with similar concepts>],
  "strengths": [
    "<specific strength with evidence>"
  ],
  "weaknesses": [
    "<specific weakness with actionable fix>"
  ],
  "sectionAnalysis": {
    "<sectionName>": {
      "status": "<Present|Missing|Weak>",
      "feedback": "<specific feedback>"
    }
  },
  "recommendations": [
    {
      "priority": "<High|Medium|Low>",
      "problem": "<what's missing>",
      "impact": "<why it matters>",
      "suggestion": "<specific actionable improvement>"
    }
  ]
}`;

    try {
        return calculateLocalAnalysis(resumeText, jdText);
        const responseText = "";
        
        const analysis = parseAIAnalysisResponse(responseText);
        console.log("[Service] Response parsed successfully");

        // Validate and normalize scores
        analysis.atsScore = Math.max(0, Math.min(100, Number(analysis.atsScore) || 0));
        analysis.jobMatchScore = Math.max(0, Math.min(100, Number(analysis.jobMatchScore) || 0));
        analysis.matchLevel = analysis.matchLevel || "Moderate Match";

        if (!Array.isArray(analysis.matchedSkills)) analysis.matchedSkills = [];
        if (!Array.isArray(analysis.matchedKeywords)) analysis.matchedKeywords = [];
        if (!Array.isArray(analysis.missingKeywords)) analysis.missingKeywords = [];
        if (!Array.isArray(analysis.partialKeywords)) analysis.partialKeywords = [];
        if (!Array.isArray(analysis.strengths)) analysis.strengths = [];
        if (!Array.isArray(analysis.weaknesses)) analysis.weaknesses = [];
        if (!Array.isArray(analysis.recommendations)) analysis.recommendations = [];

        if (!analysis.missingSkills) analysis.missingSkills = { required: [], preferred: [] };
        if (!Array.isArray(analysis.missingSkills.required)) analysis.missingSkills.required = [];
        if (!Array.isArray(analysis.missingSkills.preferred)) analysis.missingSkills.preferred = [];

        if (!analysis.sectionAnalysis) analysis.sectionAnalysis = {};

        console.log("[Service] Analysis validation complete");
        return {
            ...analysis,
            analysisSource: "ai",
            timestamp: new Date()
        };
    } catch (error) {
        console.error("[Service] AI analysis failed:", error.message);
        console.error("[Service] Error details:", error);

        // Fallback to basic analysis
        const basicATS = calculateBasicATSScore(resumeText, jdText);
        const matchPercentage = Math.round((basicATS.keywordMatchPercentage + basicATS.score) / 2);

        let matchLevel = "Weak Match";
        if (matchPercentage >= 80) matchLevel = "Excellent Match";
        else if (matchPercentage >= 65) matchLevel = "Strong Match";
        else if (matchPercentage >= 50) matchLevel = "Moderate Match";

        return {
            atsScore: basicATS.score,
            jobMatchScore: matchPercentage,
            matchLevel,
            summary: "Resume analysis completed using keyword extraction. For semantic analysis, ensure AI service is configured.",
            matchedSkills: [],
            missingSkills: { required: [], preferred: [] },
            matchedKeywords: [],
            missingKeywords: basicATS.issues,
            partialKeywords: [],
            strengths: ["Resume contains key sections"],
            weaknesses: basicATS.issues,
            sectionAnalysis: {},
            recommendations: basicATS.issues.map((issue) => ({
                priority: "High",
                problem: issue,
                impact: "Affects ATS parsing and recruiter review",
                suggestion: `Address the following: ${issue}`
            })),
            analysisSource: "fallback",
            fallbackReason: "AI service unavailable; using keyword-based analysis",
            timestamp: new Date()
        };
    }
};

const LOCAL_SKILLS = [
    ["C++", /(?:^|[^a-z0-9+#])c\+\+(?:$|[^a-z0-9+#])/i], ["C", /(?:^|[^a-z0-9+#])c(?:$|[^a-z0-9+#])/i], ["C#", /(?:^|[^a-z0-9+#])(?:c#|csharp)(?:$|[^a-z0-9+#])/i],
    ["Java", /\bjava\b/i], ["Python", /\bpython\b/i], ["JavaScript", /\bjavascript\b|\bjs\b/i],
    ["TypeScript", /\btypescript\b|\bts\b/i], ["React", /\breact(?:\.js)?\b/i],
    ["Node.js", /\bnode(?:\.js)?\b/i], ["Express", /\bexpress(?:\.js)?\b/i],
    ["MongoDB", /\bmongodb\b/i], ["SQL", /\bsql\b/i], ["MySQL", /\bmysql\b/i],
    ["PostgreSQL", /\bpostgres(?:ql)?\b/i], ["Excel", /\bexcel\b/i], ["Power BI", /\bpower\s*bi|powerbi\b/i],
    ["Tableau", /\btableau\b/i], ["Pandas", /\bpandas\b/i], ["NumPy", /\bnumpy\b/i],
    ["Matplotlib", /\bmatplotlib\b/i], ["Machine Learning", /\bmachine\s+learning\b|\bml\b/i],
    ["Deep Learning", /\bdeep\s+learning\b/i], ["Natural Language Processing", /\bnatural\s+language\s+processing\b|\bnlp\b/i],
    ["AWS", /\baws\b|amazon\s+web\s+services/i], ["Azure", /\bazure\b/i],
    ["Docker", /\bdocker\b/i], ["Git", /\bgit\b/i], ["GitHub", /\bgithub\b/i],
    ["HTML", /\bhtml(?:5)?\b/i], ["CSS", /\bcss(?:3)?\b/i], ["REST API", /\brest(?:ful)?\s*api?s?\b/i],
    ["ETL", /\betl\b|extract[,\s]+transform[,\s]+load/i], ["Statistics", /\bstatistics?\b|statistical/i],
    ["Data Visualization", /\bdata\s+visuali[sz]ation\b/i], ["Data Analysis", /\bdata\s+anal(?:ysis|ytics)\b/i],
    ["Data Cleaning", /\bdata\s+cleaning\b|clean[,\s]+transform/i], ["Dashboards", /\bdashboards?\b/i],
    ["Reporting", /\breporting|reports?\b/i], ["KPI", /\bkpis?\b|key\s+performance\s+indicators?/i],
    ["Business Intelligence", /\bbusiness\s+intelligence\b/i], ["Exploratory Data Analysis", /\bexploratory\s+data\s+analysis\b|\beda\b/i]
];

const normalizeLocalText = (text) => String(text || "")
    .toLowerCase()
    .replace(/[+#]/g, (character) => ` ${character} `)
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractLocalSkills = (text) => LOCAL_SKILLS
    .filter(([, pattern]) => pattern.test(text))
    .map(([name]) => name);

const SKILL_ALIASES = {
    JavaScript: ["javascript", "js"],
    TypeScript: ["typescript", "ts"],
    "Node.js": ["node.js", "nodejs", "node"],
    PostgreSQL: ["postgresql", "postgres"],
    "Power BI": ["power bi", "powerbi"],
    "Machine Learning": ["machine learning", "ml"],
    "Natural Language Processing": ["natural language processing", "nlp"]
};

const normalizeSkillKey = (skill) => normalizeLocalText(skill).replace(/\s+/g, "").replace(/\.js$/i, "js");
const skillVariants = (skill) => SKILL_ALIASES[skill] || [skill];
const containsSkill = (text, skill) => skillVariants(skill).some((variant) => {
    const normalizedVariant = normalizeLocalText(variant);
    if (normalizedVariant.includes(" ")) return normalizeLocalText(text).includes(normalizedVariant);
    return new RegExp(`(?:^|\\s)${normalizedVariant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|\\s)`, "i").test(normalizeLocalText(text));
});

const LOCAL_KEYWORD_STOPWORDS = new Set("a an and are as at be but by can for from had has have in into is it its may of on or our should that the their them there these they this to using was we were will with you your about after also been being both do does each few he her how if more most other own same some such than then through under very what when where which while who why work working would data analyst job description qualification qualifications collect clean analyze support business decisions".split(" "));

const extractLocalKeywords = (text) => {
    const normalized = normalizeLocalText(text);
    const tokens = normalized.match(/\b[a-z][a-z0-9+#.-]{2,}\b/g) || [];
    const tokenCounts = new Map();
    tokens.forEach((token) => {
        if (!LOCAL_KEYWORD_STOPWORDS.has(token)) tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    });
    const keywords = new Set(extractLocalSkills(text).map(normalizeLocalText));
    const meaningfulPhrases = [
        "data visualization", "data cleaning", "data analysis", "exploratory data analysis",
        "business intelligence", "machine learning", "deep learning", "natural language processing",
        "rest api", "statistical analysis", "business reporting", "data driven decision making"
    ];
    meaningfulPhrases.forEach((phrase) => {
        if (normalized.includes(phrase)) keywords.add(phrase);
    });
    tokenCounts.forEach((count, token) => {
        if (count >= 2 && token.length >= 4) keywords.add(token);
    });
    return [...keywords];
};

const formatLocalKeyword = (keyword) => {
    const skill = LOCAL_SKILLS.find(([name]) => normalizeLocalText(name) === keyword);
    return skill ? skill[0] : keyword.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const classifyJdSkills = (jdText) => {
    const required = new Set();
    const preferred = new Set();
    let context = "required";
    const lines = String(jdText || "").split(/\r?\n/);

    lines.forEach((line) => {
        const normalizedLine = normalizeLocalText(line);
        if (!normalizedLine) return;
        if (/preferred|nice to have|bonus|desired|advantage/.test(normalizedLine)) context = "preferred";
        else if (/^keywords?$|^education$|^experience$|^professional experience$|^work experience$/.test(normalizedLine)) context = "required";
        else if (/required|must have|qualifications|core skills|responsibilities|requirements/.test(normalizedLine)) context = "required";
        else if (/summary|about the role|what you will do/.test(normalizedLine)) context = "required";
        extractLocalSkills(line).forEach((skill) => (context === "preferred" ? preferred : required).add(skill));
    });

    preferred.forEach((skill) => required.delete(skill));
    return { required: [...required], preferred: [...preferred] };
};

const skillIsPartial = (skill, resumeNormalized) => {
    const aliases = {
        "statistical analysis": ["statistics"],
        "business intelligence": ["business analytics"],
        "data cleaning": ["data preprocessing", "preprocessing"],
        "data visualization": ["visualization"]
    };
    const normalizedSkill = normalizeLocalText(skill);
    if ((aliases[normalizedSkill] || []).some((alias) => resumeNormalized.includes(alias))) return true;
    const parts = normalizedSkill.split(" ").filter((part) => part.length > 3);
    const resumeTokens = new Set(resumeNormalized.split(" "));
    const overlap = parts.filter((part) => resumeTokens.has(part)).length;
    return parts.length >= 3 && overlap >= 2 && overlap < parts.length;
};

const findSection = (text, names) => {
    const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return lines.find((line) => {
        const heading = line
            .replace(/^\s*(?:[-*+]\s+|#{1,6}\s*)/, "")
            .replace(/^(?:\*\*|__)(.*?)(?:\*\*|__)\s*:?$/, "$1")
            .replace(/\s*:\s*$/, "")
            .trim();
        return names.some((name) => heading.toLowerCase() === name.toLowerCase());
    }) || "";
};

const analyzeLocalSections = (resumeText) => {
    const sectionDefinitions = [
        ["Contact", ["contact", "email", "phone"]], ["Summary", ["summary", "professional summary", "objective", "profile"]],
        ["Skills", ["skills", "technical skills", "technologies"]], ["Education", ["education", "academic"]],
        ["Experience", ["experience", "professional experience", "work experience", "employment", "work history", "professional background"]],
        ["Projects", ["projects", "academic projects", "technical projects", "project experience"]],
        ["Certifications", ["certifications", "certificates"]], ["Achievements", ["achievements", "awards"]],
        ["Links", ["links", "profiles", "linkedin", "github", "portfolio"]]
    ];
    return Object.fromEntries(sectionDefinitions.map(([section, names]) => {
        const present = Boolean(findSection(resumeText, names)) || (section === "Contact" && /@|\+?\d[\d\s().-]{7,}/.test(resumeText));
        return [section, { status: present ? "Present" : "Missing", feedback: present ? `${section} information was detected in the resume.` : `${section} information was not clearly detected.` }];
    }));
};

const calculateLocalAnalysis = async (resumeText, jdText) => {
    const resumeNormalized = normalizeLocalText(resumeText);
    const jdNormalized = normalizeLocalText(jdText);
    const jdSkillGroups = classifyJdSkills(jdText);
    const jdSkills = [...jdSkillGroups.required, ...jdSkillGroups.preferred];
    const resumeSkills = extractLocalSkills(resumeText);
    const resumeSkillSet = new Set(resumeSkills.map(normalizeSkillKey));
    const skillMatches = (skill) => skillVariants(skill).some((variant) => resumeSkillSet.has(normalizeSkillKey(variant)));
    const matchedSkills = jdSkills.filter(skillMatches);
    const missingSkills = jdSkills.filter((skill) => !skillMatches(skill));
    const missingRequired = jdSkillGroups.required.filter((skill) => !skillMatches(skill));
    const missingPreferred = jdSkillGroups.preferred.filter((skill) => !skillMatches(skill));
    const partialSkills = missingSkills.filter((skill) => skillIsPartial(skill, resumeNormalized));
    const localKeywords = extractLocalKeywords(jdText);
    const matchedKeywords = localKeywords.filter((keyword) => containsSkill(resumeText, keyword));
    const partialKeywords = localKeywords.filter((keyword) => !matchedKeywords.includes(keyword) && skillIsPartial(keyword, resumeNormalized));
    const missingKeywords = localKeywords.filter((keyword) => !matchedKeywords.includes(keyword) && !partialKeywords.includes(keyword));
    const sections = analyzeLocalSections(resumeText);
    const keywordTotal = matchedKeywords.length + partialKeywords.length + missingKeywords.length;
    const requiredMatched = jdSkillGroups.required.filter(skillMatches).length;
    const preferredMatched = jdSkillGroups.preferred.filter(skillMatches).length;
    const requiredSkillMatchRatio = jdSkillGroups.required.length ? requiredMatched / jdSkillGroups.required.length : 0;
    const preferredSkillMatchRatio = jdSkillGroups.preferred.length ? preferredMatched / jdSkillGroups.preferred.length : 0;
    const keywordRatio = keywordTotal ? (matchedKeywords.length + partialKeywords.length * 0.5) / keywordTotal : 0;
    const phraseOverlap = new Set(jdNormalized.split(" ").filter((word) => word.length > 3)).size
        ? [...new Set(jdNormalized.split(" ").filter((word) => word.length > 3))].filter((word) => resumeNormalized.includes(word)).length / new Set(jdNormalized.split(" ").filter((word) => word.length > 3)).size
        : 0;
    const sectionRatio = Object.values(sections).filter((section) => section.status === "Present").length / Object.keys(sections).length;
    let semanticSimilarity;
    try {
        semanticSimilarity = await calculateSemanticSimilarity(resumeText, jdText);
    } catch (error) {
        console.warn(`[Local NLP] Semantic model unavailable: ${error.message}`);
    }

    const atsScore = Math.round(Math.min(100, 35 + sectionRatio * 35 + keywordRatio * 30));
    const evidenceRatio = sectionRatio;
    const preferredWeight = jdSkillGroups.preferred.length ? 0.10 : 0;
    const requiredWeight = jdSkillGroups.preferred.length ? 0.45 : 0.55;
    const keywordWeight = 0.15;
    const semanticWeight = semanticSimilarity === undefined ? 0 : 0.25;
    const evidenceWeight = semanticSimilarity === undefined ? 0.10 : 0.05;
    const scoreBase = requiredSkillMatchRatio * requiredWeight * 100
        + preferredSkillMatchRatio * preferredWeight * 100
        + keywordRatio * keywordWeight * 100
        + phraseOverlap * 0.05 * 100
        + evidenceRatio * evidenceWeight * 100
        + (semanticSimilarity === undefined ? 0 : semanticSimilarity * semanticWeight * 100);
    const missingCriticalPenalty = missingRequired.length && requiredSkillMatchRatio < 0.5 ? Math.min(10, missingRequired.length * 2) : 0;
    const jobMatchScore = Math.round(Math.max(0, Math.min(100, scoreBase - missingCriticalPenalty)));
    const matchLevel = jobMatchScore >= 70 ? "Strong Match" : jobMatchScore >= 45 ? "Moderate Match" : "Weak Match";
    const strengths = [];
    const weaknesses = [];
    if (matchedSkills.length) strengths.push(`Matches ${matchedSkills.length} of ${jdSkills.length || matchedSkills.length} identified JD skills: ${matchedSkills.join(", ")}.`);
    if (keywordRatio >= 0.5) strengths.push(`Includes ${matchedKeywords.length} matched and ${partialKeywords.length} partially matched meaningful JD terms.`);
    if (sections.Experience.status === "Present" || sections.Projects.status === "Present") strengths.push("Provides detectable experience or project evidence.");
    if (semanticSimilarity !== undefined) strengths.push(`Semantic similarity between the resume and JD is ${(semanticSimilarity * 100).toFixed(1)}%.`);
    if (missingRequired.length) weaknesses.push(`Missing required JD skills: ${missingRequired.join(", ")}.`);
    if (missingPreferred.length) weaknesses.push(`Missing preferred JD skills: ${missingPreferred.join(", ")}.`);
    if (keywordRatio < 0.5) weaknesses.push(`The resume matches ${matchedKeywords.length} of ${keywordTotal} meaningful JD terms, with ${partialKeywords.length} partial matches.`);
    const recommendations = [];
    if (missingRequired.length) recommendations.push({ priority: "High", problem: `Required skills not detected: ${missingRequired.join(", ")}.`, impact: "These requirements directly affect role fit and screening relevance.", suggestion: `Add ${missingRequired.join(", ")} experience only if you genuinely have it; otherwise address the gap through a relevant project or course.` });
    if (missingPreferred.length) recommendations.push({ priority: "Low", problem: `Preferred skills not detected: ${missingPreferred.join(", ")}.`, impact: "Preferred qualifications can distinguish otherwise similar candidates.", suggestion: `Add ${missingPreferred.join(", ")} evidence only if it accurately reflects your background.` });
    if (missingKeywords.length) recommendations.push({ priority: "Medium", problem: `Resume does not clearly contain these JD phrases: ${missingKeywords.slice(0, 8).join(", ")}.`, impact: "Recruiter and ATS matching may miss relevant experience.", suggestion: "Use accurate JD terminology when it describes work already present in your background." });
    Object.entries(sections).filter(([, section]) => section.status === "Missing").slice(0, 2).forEach(([name]) => recommendations.push({ priority: "Low", problem: `${name} section is not clearly detectable.`, impact: "Incomplete structure can reduce clarity during screening.", suggestion: `Add a concise ${name.toLowerCase()} section if relevant to your experience.` }));
    return {
        atsScore, jobMatchScore, matchLevel, summary: `Local comparison found ${matchedSkills.length} matched skills, ${missingSkills.length} missing skills, ${matchedKeywords.length} matched keywords, ${partialKeywords.length} partially matched keywords, and ${missingKeywords.length} missing keywords.`,
        matchedSkills, missingSkills: { required: missingRequired, preferred: missingPreferred }, partialSkills,
        matchedKeywords: matchedKeywords.map(formatLocalKeyword),
        missingKeywords: missingKeywords.map(formatLocalKeyword),
        partialKeywords: partialKeywords.map(formatLocalKeyword),
        strengths: strengths.length ? strengths : ["No clear JD-aligned strength was detected from the extracted text."],
        weaknesses: weaknesses.length ? weaknesses : ["No material gap was detected by the local comparison."], sectionAnalysis: sections, recommendations,
        phraseOverlap,
        requiredSkillMatchRatio,
        preferredSkillMatchRatio,
        keywordRatio,
        sectionRatio,
        criticalMissingPenalty: missingCriticalPenalty,
        ...(semanticSimilarity === undefined ? {} : { semanticSimilarity }),
        analysisSource: "local", analysisMethod: semanticSimilarity === undefined ? "local-nlp" : "local-nlp-semantic", timestamp: new Date()
    };
};

const analyzeResumeAgainstJD = async (resumeText, jdText) => calculateLocalAnalysis(resumeText, jdText);

const analyzeResumeFile = async (resumePath, jdText, studentId) => {
    if (!resumePath) {
        throw new Error("Resume path is required");
    }

    if (!jdText || jdText.trim().length === 0) {
        throw new Error("Job description is required");
    }

    const resumeDirectory = path.resolve(process.cwd(), "uploads", "resumes");
    const absolutePath = path.resolve(process.cwd(), resumePath);

    console.log("[Service] analyzeResumeFile called");
    console.log("[Service] resumePath:", resumePath);
    console.log("[Service] absolutePath:", absolutePath);
    console.log("[Service] resumeDirectory:", resumeDirectory);

    // Security check: ensure path is within uploads directory
    if (!absolutePath.startsWith(`${resumeDirectory}${path.sep}`) && absolutePath !== resumeDirectory) {
        console.log("[Service] Path validation failed");
        throw new Error("Invalid resume path");
    }

    try {
        console.log("[Service] Reading file...");
        const fileBuffer = await fs.readFile(absolutePath);
        console.log("[Service] File read successfully, size:", fileBuffer.length);
        
        const ext = path.extname(resumePath).toLowerCase();
        let mimeType = "application/pdf";

        if (ext === ".pdf") {
            mimeType = "application/pdf";
        } else if (ext === ".docx" || ext === ".doc") {
            mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }

        console.log("[Service] Extracting text, mime type:", mimeType);
        const resumeText = await extractTextFromFile(fileBuffer, mimeType);
        console.log("[Service] Text extracted, length:", resumeText?.length);

        if (!resumeText || resumeText.trim().length === 0) {
            console.log("[Service] Resume text is empty");
            throw new Error("Resume file contains no text");
        }

        console.log("[Service] Calling analyzeResumeAgainstJD...");
        return await analyzeResumeAgainstJD(resumeText, jdText);
    } catch (error) {
        console.error("[Service] Error:", error.message);
        console.error("[Service] Stack:", error.stack);
        
        if (
            error.message.includes("not a valid PDF") ||
            error.message.includes("No selectable text") ||
            error.message.includes("No text found") ||
            error.message.includes("Resume file contains")
        ) {
            throw error;
        }

        console.error("Resume analysis error:", error.message);
        throw new Error("Failed to analyze resume and job description");
    }
};

module.exports = {
    analyzeResumeFile,
    analyzeResumeAgainstJD,
    extractTextFromFile,
    extractTextFromPDF,
    extractTextFromDOCX
};
