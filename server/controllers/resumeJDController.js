const { analyzeResumeFile } = require("../services/resumeJDAnalysisService");
const Student = require("../models/Student");
const { successResponse, errorResponse } = require("../utils/response");

const analyzeResumeWithJobDescription = async (req, res) => {
    try {
        console.log("[Controller] analyzeResumeWithJobDescription called");
        console.log("[Controller] req.body:", req.body);
        console.log("[Controller] req.user:", req.user?.id);
        
        const { jobDescription } = req.body;

        if (!jobDescription || jobDescription.trim().length === 0) {
            console.log("[Controller] Job description validation failed");
            return errorResponse(res, { message: "Job description is required", status: 400 });
        }

        // Fetch student to get their resume
        const student = await Student.findById(req.user.id).select("resume name email");
        console.log("[Controller] Student found:", student ? "yes" : "no");
        console.log("[Controller] Student resume path:", student?.resume);

        if (!student) {
            console.log("[Controller] Student not found");
            return errorResponse(res, { message: "Student not found", status: 404 });
        }

        if (!student.resume) {
            console.log("[Controller] Student has no resume");
            return errorResponse(res, { message: "Resume not found. Please upload a resume first.", status: 404 });
        }

        // Analyze resume against JD
        console.log("[Controller] Calling analyzeResumeFile...");
        const analysis = await analyzeResumeFile(student.resume, jobDescription, req.user.id);
        console.log("[Controller] Analysis complete:", analysis ? "success" : "null");

        // Store the most recent analysis in the student profile
        await Student.findByIdAndUpdate(req.user.id, {
            resumeJDAnalysis: analysis,
            lastResumeAnalysisDate: new Date()
        });

        return successResponse(res, {
            message: "Resume analysis completed successfully",
            data: analysis
        });
    } catch (error) {
        console.error("[Controller] ERROR:", error.message);
        console.error("[Controller] Stack:", error.stack);

        if (error.message.includes("Resume path") || error.message === "Resume not found") {
            return errorResponse(res, { message: error.message, status: 404 });
        }

        if (
            error.message.includes("not a valid PDF") ||
            error.message.includes("No selectable text") ||
            error.message.includes("No text found")
        ) {
            return errorResponse(res, { message: error.message, status: 400 });
        }

        if (error.message.includes("Job description is required")) {
            return errorResponse(res, { message: error.message, status: 400 });
        }

        return errorResponse(res, { message: error.message || "Failed to analyze resume against job description", status: 500 });
    }
};

const getRecentAnalysis = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id).select("resumeJDAnalysis lastResumeAnalysisDate");

        if (!student || !student.resumeJDAnalysis) {
            return errorResponse(res, { message: "No analysis found", status: 404 });
        }

        return successResponse(res, {
            message: "Recent analysis retrieved successfully",
            data: student.resumeJDAnalysis
        });
    } catch (error) {
        return errorResponse(res, { message: error.message || "Failed to retrieve analysis", status: 500 });
    }
};

module.exports = {
    analyzeResumeWithJobDescription,
    getRecentAnalysis
};
