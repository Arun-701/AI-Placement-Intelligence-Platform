const fs = require("fs").promises;
const path = require("path");
const { PDFParse } = require("pdf-parse");

const { generateAIResponse } = require("./geminiService");

const buildFallbackAnalysis = (extractedText) => {
    const text = (extractedText || "").replace(/\r/g, "\n");
    const lower = text.toLowerCase();

    const techLists = {
        programmingLanguages: [/javascript|\bjs\b/, /python/, /java(?!script)/, /c\+\+|cpp/, /c#|csharp/, /ruby/, /go\b/, /typescript/],
        frameworks: [/react/, /angular/, /vue/, /django/, /flask/, /spring/, /express/],
        databases: [/mongodb|mongoose/, /mysql/, /postgres(sql)?/, /sqlite/, /oracle/],
        tools: [/docker/, /kubernetes|k8s/, /git\b/, /jenkins/, /aws|azure|gcp/],
        others: [/rest api|graphql/, /nlp|machine learning|ml|deep learning/]
    };

    const detectFromList = (list) => {
        const found = new Set();
        for (const rx of list) {
            const m = lower.match(rx);
            if (m) found.add(m[0].replace(/\b/g, ""));
        }
        return Array.from(found);
    };

    const programmingLanguages = detectFromList(techLists.programmingLanguages);
    const frameworks = detectFromList(techLists.frameworks);
    const databases = detectFromList(techLists.databases);
    const tools = detectFromList(techLists.tools);
    const otherTechnicalSkills = detectFromList(techLists.others);

    // Basic contact info detection
    const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const phoneMatch = text.match(/(\+?\d[\d\s\-().]{7,}\d)/);

    // Section extraction heuristics
    const lines = text.split(/\n{1,}/).map(l => l.trim()).filter(Boolean);
    const findSection = (names) => {
        const idx = lines.findIndex(l => names.some(n => l.toLowerCase().startsWith(n)));
        if (idx === -1) return [];
        const out = [];
        for (let i = idx + 1; i < lines.length; i++) {
            const head = lines[i].toLowerCase();
            if (/^(experience|education|projects|skills|certifications|achievements|summary|contact)/.test(head)) break;
            out.push(lines[i]);
        }
        return out;
    };

    const educationBlock = findSection(["education", "academic qualifications", "academic"]);
    const experienceBlock = findSection(["experience", "work experience", "professional experience", "internship"]);
    const projectsBlock = findSection(["projects", "personal projects"]);
    const certBlock = findSection(["certifications", "certification"]);

    const parseListItems = (block) => block.map(b => ({ raw: b }));

    const education = parseListItems(educationBlock);
    const experience = parseListItems(experienceBlock);
    const projects = parseListItems(projectsBlock);
    const certifications = parseListItems(certBlock);

    // ATS and overall scoring heuristics
    let atsScore = 100;
    const issues = [];
    if (!emailMatch) { atsScore -= 20; issues.push('Missing contact email'); }
    if (!phoneMatch) { atsScore -= 10; issues.push('Missing contact phone'); }
    if (programmingLanguages.length === 0 && frameworks.length === 0) { atsScore -= 20; issues.push('Few technical keywords detected'); }
    if (education.length === 0) { atsScore -= 10; issues.push('Education section missing'); }
    if (projects.length === 0 && experience.length === 0) { atsScore -= 20; issues.push('No projects or experience listed'); }
    if (text.length < 200) { atsScore -= 10; issues.push('Very short extracted text (possible PDF quality issue)'); }
    atsScore = Math.max(0, Math.min(100, Math.round(atsScore)));

    // Overall score weighted
    const skillsScore = Math.min(30, (programmingLanguages.length + frameworks.length + databases.length + tools.length) * 5);
    const projectsScore = projects.length > 0 ? 20 : 0;
    const educationScore = education.length > 0 ? 15 : 0;
    const experienceScore = experience.length > 0 ? 20 : 0;
    const overallScore = Math.max(0, Math.min(100, Math.round(skillsScore + projectsScore + educationScore + experienceScore + (atsScore * 0.15))));

    const strengths = [];
    if (programmingLanguages.length >= 2) strengths.push('Multiple programming languages');
    if (frameworks.length) strengths.push('Framework/library exposure');
    if (projects.length) strengths.push('Project-based evidence');

    const weaknesses = [];
    if (experience.length === 0) weaknesses.push('No professional experience listed');
    if (certifications.length === 0) weaknesses.push('No certifications listed');

    const missingSkills = [];
    if (programmingLanguages.length < 2) missingSkills.push('Add more programming languages with proficiency levels');

    const recommendations = [];
    if (projects.length === 0) recommendations.push('Add at least one project with technologies and outcomes');
    if (experience.length === 0) recommendations.push('Include internships or relevant project roles to show professional exposure');

    const recommendedRoles = [];
    if (programmingLanguages.length > 0 || frameworks.length > 0) recommendedRoles.push('Software Developer');
    if (programmingLanguages.includes('python') || lower.includes('data') || lower.includes('machine learning')) recommendedRoles.push('Data Analyst / ML Engineer');

    const improvementPlan = [];
    if (projects.length === 0) improvementPlan.push('Create a portfolio project and document technologies and outcomes');
    if (experience.length === 0) improvementPlan.push('Seek internships or freelance projects to gain experience');

    return {
        overallScore,
        atsScore,
        summary: extractedText ? `Extracted resume text. Detected ${programmingLanguages.length} languages and ${projects.length} projects.` : 'No extractable text.',
        programmingLanguages,
        frameworks,
        databases,
        tools,
        otherTechnicalSkills,
        education,
        experience,
        projects,
        certifications,
        strengths,
        weaknesses,
        missingSkills,
        atsAnalysis: { score: atsScore, keywordMatch: [], missingKeywords: [], formattingIssues: [], sectionIssues: issues },
        recommendations,
        recommendedRoles,
        improvementPlan,
        explanation: 'Fallback extraction-based analysis; no AI response available.'
    };
};

const resumeDirectory = path.resolve(process.cwd(), "uploads", "resumes");

const resolveResumePath = (resumePath) => {
    if (!resumePath) {
        return null;
    }

    const absolutePath = path.resolve(process.cwd(), resumePath);

    if (absolutePath !== resumeDirectory && !absolutePath.startsWith(`${resumeDirectory}${path.sep}`)) {
        return null;
    }

    return absolutePath;
};

const extractTextFromResume = async (resumePath) => {
    const resolvedPath = resolveResumePath(resumePath);

    if (!resolvedPath) {
        throw new Error("Resume path is invalid");
    }

    try {
        const fileBuffer = await fs.readFile(resolvedPath);
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
        if (error.message === "Unable to extract resume text" || error.message === "No selectable text found in PDF" || error.message === "Uploaded file is not a valid PDF") {
            throw error;
        }

        console.error("Resume text extraction error:", error.message);
        throw new Error("Unable to extract resume text");
    }
};

const normalizeAnalysis = (analysis) => {
    const summary = typeof analysis?.summary === "string" ? analysis.summary.trim() : "";
    const skills = Array.isArray(analysis?.skills)
        ? analysis.skills.filter((skill) => typeof skill === "string" && skill.trim()).map((skill) => skill.trim())
        : [];
    const strengths = Array.isArray(analysis?.strengths)
        ? analysis.strengths.filter((strength) => typeof strength === "string" && strength.trim()).map((strength) => strength.trim())
        : [];
    const missingSkills = Array.isArray(analysis?.missingSkills)
        ? analysis.missingSkills.filter((skill) => typeof skill === "string" && skill.trim()).map((skill) => skill.trim())
        : [];
    const improvements = Array.isArray(analysis?.improvements)
        ? analysis.improvements.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
        : [];

    const numericScore = Number(analysis?.resumeScore);
    const resumeScore = Number.isFinite(numericScore)
        ? Math.min(100, Math.max(0, Math.round(numericScore)))
        : 0;

    return {
        summary,
        skills,
        strengths,
        missingSkills,
        improvements,
        resumeScore
    };
};

const parseAnalysisResponse = (responseText) => {
    const trimmedText = String(responseText || "").trim();
    const jsonStart = trimmedText.indexOf("{");
    const jsonEnd = trimmedText.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        throw new Error("Invalid AI response format");
    }

    const jsonText = trimmedText.slice(jsonStart, jsonEnd + 1);

    let parsed;
    try {
        parsed = JSON.parse(jsonText);
    } catch (error) {
        throw new Error("Invalid AI response format");
    }

    // Validate and normalize to the strict schema requested by the product
    const normalized = {
        overallScore: Number.isFinite(Number(parsed.overallScore)) ? Math.max(0, Math.min(100, Math.round(parsed.overallScore))) : 0,
        atsScore: Number.isFinite(Number(parsed.atsScore)) ? Math.max(0, Math.min(100, Math.round(parsed.atsScore))) : 0,
        summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
        detectedSkills: {
            programmingLanguages: Array.isArray(parsed.detectedSkills?.programmingLanguages) ? parsed.detectedSkills.programmingLanguages : [],
            frameworks: Array.isArray(parsed.detectedSkills?.frameworks) ? parsed.detectedSkills.frameworks : [],
            databases: Array.isArray(parsed.detectedSkills?.databases) ? parsed.detectedSkills.databases : [],
            tools: Array.isArray(parsed.detectedSkills?.tools) ? parsed.detectedSkills.tools : [],
            otherTechnicalSkills: Array.isArray(parsed.detectedSkills?.otherTechnicalSkills) ? parsed.detectedSkills.otherTechnicalSkills : []
        },
        education: Array.isArray(parsed.education) ? parsed.education : [],
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
        atsAnalysis: typeof parsed.atsAnalysis === 'object' && parsed.atsAnalysis !== null ? {
            score: Number.isFinite(Number(parsed.atsAnalysis.score)) ? Math.max(0, Math.min(100, Math.round(parsed.atsAnalysis.score))) : 0,
            keywordMatch: Array.isArray(parsed.atsAnalysis.keywordMatch) ? parsed.atsAnalysis.keywordMatch : [],
            missingKeywords: Array.isArray(parsed.atsAnalysis.missingKeywords) ? parsed.atsAnalysis.missingKeywords : [],
            formattingIssues: Array.isArray(parsed.atsAnalysis.formattingIssues) ? parsed.atsAnalysis.formattingIssues : [],
            sectionIssues: Array.isArray(parsed.atsAnalysis.sectionIssues) ? parsed.atsAnalysis.sectionIssues : []
        } : { score: 0, keywordMatch: [], missingKeywords: [], formattingIssues: [], sectionIssues: [] },
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        recommendedRoles: Array.isArray(parsed.recommendedRoles) ? parsed.recommendedRoles : [],
        improvementPlan: Array.isArray(parsed.improvementPlan) ? parsed.improvementPlan : []
    };

    return normalized;
};

const analyzeResume = async (resumePath) => {
    const extractedText = await extractTextFromResume(resumePath);

    const prompt = `You are an expert ATS Resume Analyzer and career advisor.

Analyze the resume carefully and produce a comprehensive, structured JSON analysis. Only return valid JSON (no markdown, no explanations).

The JSON MUST follow exactly this schema (use empty arrays or empty strings when data is not present):
{
  "overallScore": 0,
  "summary": "",
  "detectedSkills": {
    "programmingLanguages": [],
    "webTechnologies": [],
    "databases": [],
    "frameworks": [],
    "tools": [],
    "cloudDevOps": [],
    "dataAiMl": [],
    "other": []
  },
  "softSkills": [],
  "strengths": [],
  "weaknesses": [],
  "missingSkills": [],
  "education": [],
  "projects": [],
  "experience": [],
  "atsAnalysis": {
    "score": 0,
    "keywords": [],
    "missingKeywords": [],
    "formattingSuggestions": [],
    "contentSuggestions": []
  },
  "recommendedRoles": [],
  "skillGapAnalysis": [],
  "recommendations": [],
  "learningRecommendations": []
}

Resume Text:
${extractedText}`;

    try {
        const responseText = await generateAIResponse(prompt);
        const parsed = parseAnalysisResponse(responseText);
        return { ...parsed, analysisSource: 'ai' };
    } catch (error) {
        // Log the AI error and return a conservative fallback that does not pretend to be AI
        console.error('AI analysis failed:', error.message);
        const fallback = buildFallbackAnalysis(extractedText);
        // Map fallback into comprehensive schema
        const mapped = {
            overallScore: Number.isFinite(Number(fallback.resumeScore)) ? Math.max(0, Math.min(100, Math.round(fallback.resumeScore))) : 0,
            summary: fallback.summary || '',
            detectedSkills: {
                programmingLanguages: Array.isArray(fallback.skills) ? fallback.skills : [],
                webTechnologies: [],
                databases: [],
                frameworks: [],
                tools: [],
                cloudDevOps: [],
                dataAiMl: [],
                other: []
            },
            softSkills: [],
            strengths: fallback.strengths || [],
            weaknesses: fallback.weaknesses || [],
            missingSkills: fallback.missingSkills || [],
            education: [],
            projects: [],
            experience: [],
            atsAnalysis: { score: 0, keywords: [], missingKeywords: [], formattingSuggestions: [], contentSuggestions: [] },
            recommendedRoles: [],
            skillGapAnalysis: [],
            recommendations: fallback.recommendations || [],
            learningRecommendations: [],
            analysisSource: 'fallback',
            fallbackExplanation: fallback.explanation || ''
        };

        // keep legacy fields for compatibility
        return { ...mapped, skills: mapped.detectedSkills.programmingLanguages, resumeScore: mapped.overallScore };
    }
};

module.exports = {
    analyzeResume
};
