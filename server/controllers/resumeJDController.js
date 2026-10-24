const fs = require("fs").promises;
const path = require("path");
const { analyzeResumeFile, extractTextFromFile } = require("../services/resumeJDAnalysisService");
const { analyzeResume } = require("../services/resumeAnalysisService");
const {
    validateJobDescription,
    buildAnalysisRecord,
    persistResumeJDAnalysis,
    analysisBelongsToId
} = require("../services/resumeJDRecordService");
const Student = require("../models/Student");
const { successResponse, errorResponse } = require("../utils/response");

const removeFile = async (filePath) => {
    if (!filePath) return;
    try {
        await fs.unlink(filePath);
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.error("Resume analysis file cleanup failed:", error.message);
        }
    }
};

const scoreFromAnalysis = (...values) => {
    for (const value of values) {
        if (value === null || value === undefined || value === "" || typeof value === "boolean") continue;
        const score = Number(value);
        if (Number.isFinite(score) && score >= 0 && score <= 100) return Math.round(score);
    }
    return null;
};

const analyzeResumeWithJobDescription = async (req, res) => {
    const resumeFile = req.files?.resume?.[0] || null;
    const jobDescriptionFile = req.files?.jobDescriptionFile?.[0] || null;
    let saved = false;
    let previousResume = "";

    try {
        const body = req.body || {};
        let jobDescription = typeof body.jobDescription === "string" ? body.jobDescription.trim() : "";
        if (!jobDescription && jobDescriptionFile) {
            const fileBuffer = await fs.readFile(jobDescriptionFile.path);
            jobDescription = await extractTextFromFile(
                fileBuffer,
                jobDescriptionFile.mimetype,
                jobDescriptionFile.path
            );
        }

        const validation = validateJobDescription(jobDescription);
        if (!validation.valid) {
            return errorResponse(res, { message: validation.message, status: 400 });
        }

        const student = await Student.findById(req.user.id).select(
            "resume resumeAnalysis resumeScore resumeOriginalName resumeMimeType resumeSize resumeJDAnalysis lastResumeAnalysisDate"
        );
        if (!student) {
            return errorResponse(res, { message: "Student not found", status: 404 });
        }

        previousResume = student.resume || "";
        const resumePath = resumeFile
            ? `uploads/resumes/${resumeFile.filename}`
            : previousResume;
        if (!resumePath) {
            return errorResponse(res, {
                message: "Resume not found. Please upload a resume first.",
                status: 404
            });
        }

        const resumeMetadata = resumeFile
            ? {
                resumeOriginalName: resumeFile.originalname || resumeFile.filename,
                resumeMimeType: resumeFile.mimetype || "",
                resumeSize: Number(resumeFile.size) || 0
            }
            : {
                resumeOriginalName: student.resumeOriginalName || path.basename(resumePath),
                resumeMimeType: student.resumeMimeType || "",
                resumeSize: Number(student.resumeSize) || 0
            };

        const [analysis, resumeAnalysis] = await Promise.all([
            analyzeResumeFile(resumePath, validation.value, req.user.id),
            resumeFile ? analyzeResume(resumePath) : Promise.resolve(student.resumeAnalysis || {})
        ]);
        const atsScore = scoreFromAnalysis(analysis?.atsScore);
        if (atsScore === null) {
            throw new Error("Resume analysis did not return a valid ATS score");
        }

        const record = buildAnalysisRecord({
            analysis,
            student: {
                ...resumeMetadata,
                resume: resumePath
            },
            jobDescription: validation.value,
            jobDescriptionSource: body.jobDescriptionSource,
            jobDescriptionFileName: body.jobDescriptionFileName
                || jobDescriptionFile?.originalname
                || ""
        });
        record.resumeScore = atsScore;

        student.resume = resumePath;
        student.resumeOriginalName = resumeMetadata.resumeOriginalName;
        student.resumeMimeType = resumeMetadata.resumeMimeType;
        student.resumeSize = resumeMetadata.resumeSize;
        student.resumeAnalysis = resumeAnalysis;
        student.resumeScore = atsScore;
        if (typeof student.markModified === "function") {
            student.markModified("resumeJDAnalysis");
        }
        await persistResumeJDAnalysis(student, record);
        saved = true;

        const savedStudent = await Student.findById(req.user.id)
            .select("resumeJDAnalysis")
            .lean();
        const savedRecord = savedStudent?.resumeJDAnalysis;
        if (!analysisBelongsToId(savedRecord, record.analysisId)) {
            throw new Error("Resume analysis was not persisted correctly");
        }

        if (resumeFile && previousResume && previousResume !== resumePath) {
            const resumeDirectory = path.resolve(process.cwd(), "uploads", "resumes");
            const previousFilePath = path.resolve(process.cwd(), previousResume);
            if (previousFilePath.startsWith(`${resumeDirectory}${path.sep}`)) {
                await removeFile(previousFilePath);
            }
        }

        return successResponse(res, {
            message: "Resume analysis completed successfully",
            data: {
                ...savedRecord,
                analysisId: String(savedRecord.analysisId)
            }
        });
    } catch (error) {
        console.error("Resume analysis failed:", error.message);

        const isNotFoundError = error.message === "Student not found"
            || /Resume path|Resume not found|Invalid resume path/i.test(error.message);
        const isInputError = /not a valid (PDF|DOCX|DOC)|No selectable text|No text found|No readable text|Unable to extract|File is empty|Unsupported (file type|resume format)|Resume file contains no text/i.test(error.message);
        const status = isNotFoundError ? 404 : isInputError ? 400 : 500;
        return errorResponse(res, {
            message: error.message || "Failed to analyze resume against job description",
            status
        });
    } finally {
        if (jobDescriptionFile) await removeFile(jobDescriptionFile.path);
        if (resumeFile && !saved) await removeFile(resumeFile.path);
    }
};

const extractJobDescription = async (req, res) => {
    try {
        if (!req.file?.buffer) {
            return errorResponse(res, { message: "Job description file is required", status: 400 });
        }

        const text = await extractTextFromFile(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname
        );
        const validation = validateJobDescription(text);
        if (!validation.valid) {
            return errorResponse(res, { message: validation.message, status: 400 });
        }

        return successResponse(res, {
            message: "Job description extracted successfully",
            data: {
                text: validation.value,
                fileName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                characterCount: validation.value.length
            }
        });
    } catch (error) {
        const clientError = /No text found|Unable to extract|not a valid PDF|Unsupported file type|File is empty/i.test(
            error.message || ""
        );
        return errorResponse(res, {
            message: error.message || "Failed to extract job description",
            status: clientError ? 400 : 500
        });
    }
};

const getRecentAnalysis = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id).select("resumeJDAnalysis");
        if (!student?.resumeJDAnalysis) {
            return errorResponse(res, { message: "No analysis found", status: 404 });
        }

        return successResponse(res, {
            message: "Recent analysis retrieved successfully",
            data: student.resumeJDAnalysis
        });
    } catch (error) {
        return errorResponse(res, {
            message: error.message || "Failed to retrieve analysis",
            status: 500
        });
    }
};

const getAnalysisById = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id).select("resumeJDAnalysis");
        const analysis = student?.resumeJDAnalysis;
        if (!analysisBelongsToId(analysis, req.params.analysisId)) {
            return errorResponse(res, { message: "Analysis not found", status: 404 });
        }

        return successResponse(res, {
            message: "Analysis retrieved successfully",
            data: analysis
        });
    } catch (error) {
        return errorResponse(res, {
            message: error.message || "Failed to retrieve analysis",
            status: 500
        });
    }
};

module.exports = {
    analyzeResumeWithJobDescription,
    extractJobDescription,
    getRecentAnalysis,
    getAnalysisById
};
