const fs = require("fs").promises;
const path = require("path");
const pdfParse = require("pdf-parse");

const { generateAIResponse } = require("./geminiService");

const buildFallbackAnalysis = (extractedText) => {
    const text = (extractedText || "").toLowerCase();
    const skillMatches = [
        { skill: "JavaScript", regex: /javascript|js/ },
        { skill: "React", regex: /react/ },
        { skill: "Node.js", regex: /node\.js|nodejs|express/ },
        { skill: "Python", regex: /python/ },
        { skill: "MongoDB", regex: /mongodb|mongoose/ },
        { skill: "SQL", regex: /sql|mysql|postgres/ },
        { skill: "AWS", regex: /aws|cloud/ },
        { skill: "Docker", regex: /docker/ }
    ];

    const detectedSkills = skillMatches
        .filter((entry) => entry.regex.test(text))
        .map((entry) => entry.skill);

    const summary = extractedText
        ? `Resume text was extracted successfully and indicates experience in ${detectedSkills.length > 0 ? detectedSkills.join(", ") : "core technical skills"}.`
        : "Resume text could not be parsed reliably.";

    const resumeScore = Math.min(100, Math.max(20, 55 + (detectedSkills.length * 5)));

    return {
        summary,
        skills: detectedSkills,
        strengths: detectedSkills.length > 0 ? ["Technical skill coverage"] : ["Found measurable experience"],
        missingSkills: detectedSkills.length < 4 ? ["Add more specific skills and measurable outcomes"] : [],
        improvements: ["Add quantifiable achievements and project outcomes"],
        resumeScore,
        explanation: "Fallback analysis used rule-based resume parsing because the AI service was unavailable or returned an invalid response."
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
        const pdfData = await pdfParse(fileBuffer);
        const extractedText = pdfData?.text?.trim();

        if (!extractedText) {
            throw new Error("Unable to extract resume text");
        }

        return extractedText;
    } catch (error) {
        if (error.message === "Unable to extract resume text") {
            throw error;
        }

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
    const trimmedText = responseText.trim();
    const jsonStart = trimmedText.indexOf("{");
    const jsonEnd = trimmedText.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        throw new Error("Invalid AI response format");
    }

    const jsonText = trimmedText.slice(jsonStart, jsonEnd + 1);

    try {
        const parsed = JSON.parse(jsonText);
        return normalizeAnalysis(parsed);
    } catch (error) {
        throw new Error("Invalid AI response format");
    }
};

const analyzeResume = async (resumePath) => {
    const extractedText = await extractTextFromResume(resumePath);

    const prompt = `You are an expert ATS Resume Analyzer.

Analyze the resume carefully.

Return ONLY valid JSON.
Do NOT use markdown.
Do NOT include explanations.
Do NOT wrap the JSON inside \`\`\`.

Return exactly this structure:
{
  "summary":"",
  "skills":[],
  "strengths":[],
  "missingSkills":[],
  "improvements":[],
  "resumeScore":0
}

Resume Text:
${extractedText}`;

    try {
        const responseText = await generateAIResponse(prompt);
        return parseAnalysisResponse(responseText);
    } catch (error) {
        return buildFallbackAnalysis(extractedText);
    }
};

module.exports = {
    analyzeResume
};
