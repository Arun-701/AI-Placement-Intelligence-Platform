const assert = require("assert");
const Student = require("../models/Student");
const resumeJDAnalysisService = require("../services/resumeJDAnalysisService");
const resumeAnalysisService = require("../services/resumeAnalysisService");

const originalFindById = Student.findById;
const originalAnalyzeResumeFile = resumeJDAnalysisService.analyzeResumeFile;
const originalAnalyzeResume = resumeAnalysisService.analyzeResume;

const previousAnalysis = { analysisId: "previous-report", atsScore: 71 };
const student = {
    resume: "uploads/resumes/current-resume.pdf",
    resumeOriginalName: "current-resume.pdf",
    resumeMimeType: "application/pdf",
    resumeSize: 1024,
    resumeJDAnalysis: previousAnalysis,
    lastResumeAnalysisDate: new Date("2025-01-01T00:00:00.000Z"),
    saveCalls: 0,
    async save() {
        this.saveCalls += 1;
    }
};

let queriedStudentId;
let analysisArguments;
let analysisError = null;
Student.findById = (studentId) => {
    queriedStudentId = studentId;
    const result = studentId === "student-a" ? student : null;
    const selection = Promise.resolve(result);
    selection.lean = async () => result;
    return { select: () => selection };
};

const createResponse = () => ({
    statusCode: 200,
    body: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    }
});

const run = async () => {
    try {
        resumeJDAnalysisService.analyzeResumeFile = async (...args) => {
            analysisArguments = args;
            if (analysisError) throw analysisError;
            return {
                atsScore: 84,
                jobMatchScore: 68,
                matchedKeywords: ["JavaScript"],
                partialKeywords: [],
                missingKeywords: []
            };
        };
        resumeAnalysisService.analyzeResume = async () => ({
            resumeScore: 68,
            summary: "Resume summary"
        });
        const { analyzeResumeWithJobDescription, getAnalysisById } = require("../controllers/resumeJDController");

        const missingDescriptionResponse = createResponse();
        await analyzeResumeWithJobDescription(
            { user: { id: "student-a" }, body: undefined },
            missingDescriptionResponse
        );
        assert.strictEqual(missingDescriptionResponse.statusCode, 400);
        assert.match(missingDescriptionResponse.body.message, /job description is required/i);
        assert.strictEqual(student.saveCalls, 0);

        const analysisResponse = createResponse();
        const jobDescription = "  Software Engineer with JavaScript  ";
        await analyzeResumeWithJobDescription(
            {
                user: { id: "student-a" },
                body: { jobDescription, jobDescriptionSource: "paste" },
                files: {
                    resume: [{
                        filename: "replacement-resume.pdf",
                        originalname: "Asha-Resume.pdf",
                        mimetype: "application/pdf",
                        size: 2048
                    }]
                }
            },
            analysisResponse
        );
        assert.strictEqual(analysisResponse.statusCode, 200);
        assert.deepStrictEqual(analysisArguments, [
            "uploads/resumes/replacement-resume.pdf",
            "Software Engineer with JavaScript",
            "student-a"
        ]);
        assert.strictEqual(analysisResponse.body.data.atsScore, 84);
        assert.strictEqual(analysisResponse.body.data.resumeInfo.fileName, "Asha-Resume.pdf");
        assert.strictEqual(student.resume, "uploads/resumes/replacement-resume.pdf");
        assert.strictEqual(student.resumeScore, 84);
        assert.strictEqual(student.resumeJDAnalysis.analysisId, analysisResponse.body.data.analysisId);
        const serializedAnalysisResponse = JSON.parse(JSON.stringify(analysisResponse.body));
        assert.strictEqual(serializedAnalysisResponse.data.analysisId, student.resumeJDAnalysis.analysisId);
        assert.strictEqual(student.lastResumeAnalysisDate, analysisResponse.body.data.timestamp);
        assert.strictEqual(student.saveCalls, 1);

        const { getRecentAnalysis } = require("../controllers/resumeJDController");
        const latestResponse = createResponse();
        await getRecentAnalysis({ user: { id: "student-a" } }, latestResponse);
        assert.strictEqual(latestResponse.statusCode, 200);
        assert.strictEqual(latestResponse.body.data.analysisId, serializedAnalysisResponse.data.analysisId);

        const ownReportResponse = createResponse();
        await getAnalysisById(
            { user: { id: "student-a" }, params: { analysisId: student.resumeJDAnalysis.analysisId } },
            ownReportResponse
        );
        assert.strictEqual(queriedStudentId, "student-a");
        assert.strictEqual(ownReportResponse.statusCode, 200);

        const invalidReportResponse = createResponse();
        await getAnalysisById(
            { user: { id: "student-a" }, params: { analysisId: "not-the-saved-report-id" } },
            invalidReportResponse
        );
        assert.strictEqual(invalidReportResponse.statusCode, 404);

        const otherReportResponse = createResponse();
        await getAnalysisById(
            { user: { id: "student-b" }, params: { analysisId: student.resumeJDAnalysis.analysisId } },
            otherReportResponse
        );
        assert.strictEqual(queriedStudentId, "student-b");
        assert.strictEqual(otherReportResponse.statusCode, 404);

        const successfulAnalysis = student.resumeJDAnalysis;
        analysisError = new Error("Unable to extract text from DOCX");
        const failureResponse = createResponse();
        await analyzeResumeWithJobDescription(
            {
                user: { id: "student-a" },
                body: { jobDescription: "Another valid JD" },
                files: {
                    resume: [{
                        filename: "failed-replacement.pdf",
                        originalname: "Failed-Resume.pdf",
                        mimetype: "application/pdf",
                        size: 4096
                    }]
                }
            },
            failureResponse
        );
        assert.strictEqual(failureResponse.statusCode, 400);
        assert.strictEqual(student.resumeJDAnalysis, successfulAnalysis);
        assert.strictEqual(student.resume, "uploads/resumes/replacement-resume.pdf");
        assert.strictEqual(student.resumeOriginalName, "Asha-Resume.pdf");
        assert.strictEqual(student.resumeScore, 84);
        assert.strictEqual(student.saveCalls, 1);

        console.log("resume JD controller tests passed");
    } finally {
        analysisError = null;
        Student.findById = originalFindById;
        resumeJDAnalysisService.analyzeResumeFile = originalAnalyzeResumeFile;
        resumeAnalysisService.analyzeResume = originalAnalyzeResume;
    }
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
