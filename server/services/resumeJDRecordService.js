const crypto = require("crypto");
const path = require("path");

const MAX_JOB_DESCRIPTION_LENGTH = 5000;

const validateJobDescription = (value) => {
    if (typeof value !== "string" || !value.trim()) {
        return { valid: false, message: "Job description is required" };
    }
    if (value.trim().length > MAX_JOB_DESCRIPTION_LENGTH) {
        return {
            valid: false,
            message: `Job description must be ${MAX_JOB_DESCRIPTION_LENGTH} characters or fewer`
        };
    }
    return { valid: true, value: value.trim() };
};

const buildAnalysisRecord = ({
    analysis,
    student,
    jobDescription,
    jobDescriptionSource = "paste",
    jobDescriptionFileName = ""
}) => {
    const timestamp = new Date();
    return {
        ...analysis,
        analysisId: crypto.randomUUID(),
        timestamp,
        createdAt: timestamp,
        resumeInfo: {
            fileName: student.resumeOriginalName || path.basename(student.resume || "resume"),
            mimeType: student.resumeMimeType || "",
            size: Number(student.resumeSize) || 0,
            viewUrl: "/api/student/resume/file"
        },
        jobDescriptionInfo: {
            source: jobDescriptionSource === "file" ? "file" : "paste",
            fileName: jobDescriptionSource === "file" ? String(jobDescriptionFileName || "") : "",
            characterCount: jobDescription.length
        },
        jobDescriptionText: jobDescription
    };
};

const persistResumeJDAnalysis = async (student, record) => {
    const previousAnalysis = student.resumeJDAnalysis;
    const previousTimestamp = student.lastResumeAnalysisDate;
    student.resumeJDAnalysis = record;
    student.lastResumeAnalysisDate = record.timestamp;
    try {
        await student.save();
    } catch (error) {
        student.resumeJDAnalysis = previousAnalysis;
        student.lastResumeAnalysisDate = previousTimestamp;
        throw error;
    }
    return record;
};

const analysisBelongsToId = (analysis, analysisId) => Boolean(
    analysis && analysis.analysisId && String(analysis.analysisId) === String(analysisId || "")
);

module.exports = {
    MAX_JOB_DESCRIPTION_LENGTH,
    validateJobDescription,
    buildAnalysisRecord,
    persistResumeJDAnalysis,
    analysisBelongsToId
};
