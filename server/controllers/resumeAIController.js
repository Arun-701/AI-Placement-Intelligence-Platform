const Student = require("../models/Student");
const AssessmentResult = require("../models/AssessmentResult");
const { successResponse, errorResponse } = require("../utils/response");
const { analyzeResume } = require("../services/resumeAnalysisService");
const { calculatePlacementReadiness } = require("../services/readinessScoringService");
const {
    refreshResumeAnalysis,
    getPlacementRecommendation,
    getSkillGapAnalysis,
    getLearningRecommendations
} = require("../services/aiResumeService");
const { createNotification } = require("../services/notificationService");

const analyzeStudentResume = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id).select("resume skills cgpa placementReadinessScore readinessProfile");

        if (!student) {
            return errorResponse(res, { message: "Student not found", status: 404 });
        }

        if (!student.resume) {
            return errorResponse(res, { message: "Resume not found", status: 404 });
        }

        const analysis = await analyzeResume(student.resume);
        const assessmentResults = await AssessmentResult.find({ student: req.user.id, completed: true })
            .select("percentage")
            .lean();
        const readiness = calculatePlacementReadiness(student, analysis, assessmentResults);

        const readinessProfile = {
            score: readiness.score,
            level: readiness.level,
            explanation: readiness.explanation,
            recommendedActions: readiness.recommendedActions,
            lastCalculatedAt: new Date()
        };

        await Student.findByIdAndUpdate(req.user.id, {
            placementReadinessScore: readiness.score,
            readinessProfile
        });

        try {
            await createNotification({
                recipient: req.user.id,
                recipientType: "student",
                title: "Resume Analysis Complete",
                message: "Your resume analysis is complete. Review your profile and next steps.",
                type: "Resume Analysis Complete",
                priority: "Medium",
                referenceId: req.user.id,
                referenceModel: "Student"
            });
        } catch (notificationError) {
            console.error("Notification creation failed:", notificationError.message);
        }

        return successResponse(res, {
            message: "Resume analysis completed successfully",
            data: {
                ...analysis,
                readinessProfile
            }
        });
    } catch (error) {
        if (error.message === "Unable to extract resume text") {
            return errorResponse(res, { message: "Unable to extract resume text", status: 400 });
        }

        return errorResponse(res, { message: error.message || "Failed to analyze resume", status: 500 });
    }
};

const refreshStudentResumeAnalysis = async (req, res) => {
    try {
        const analysis = await refreshResumeAnalysis(req.user.id);
        return successResponse(res, {
            message: "Resume analysis refreshed successfully",
            data: analysis
        });
    } catch (error) {
        if (error.message === "Student not found" || error.message === "Resume not found") {
            return errorResponse(res, { message: error.message, status: 404 });
        }
        return errorResponse(res, { message: error.message || "Failed to refresh resume analysis", status: 500 });
    }
};

const fetchPlacementRecommendation = async (req, res) => {
    try {
        const recommendation = await getPlacementRecommendation(req.user.id);
        return successResponse(res, {
            message: "Placement recommendation generated successfully",
            data: recommendation
        });
    } catch (error) {
        if (error.message === "Student not found" || error.message === "Resume not found") {
            return errorResponse(res, { message: error.message, status: 404 });
        }
        return errorResponse(res, { message: error.message || "Failed to generate placement recommendation", status: 500 });
    }
};

const getResumeSkillGapAnalysis = async (req, res) => {
    try {
        const gapAnalysis = await getSkillGapAnalysis(req.user.id);
        return successResponse(res, {
            message: "Skill gap analysis generated successfully",
            data: gapAnalysis
        });
    } catch (error) {
        if (error.message === "Student not found" || error.message === "Resume not found") {
            return errorResponse(res, { message: error.message, status: 404 });
        }
        return errorResponse(res, { message: error.message || "Failed to generate skill gap analysis", status: 500 });
    }
};

const getResumeLearningRecommendations = async (req, res) => {
    try {
        const recommendations = await getLearningRecommendations(req.user.id);
        return successResponse(res, {
            message: "Learning recommendations generated successfully",
            data: recommendations
        });
    } catch (error) {
        if (error.message === "Student not found" || error.message === "Resume not found") {
            return errorResponse(res, { message: error.message, status: 404 });
        }
        return errorResponse(res, { message: error.message || "Failed to generate learning recommendations", status: 500 });
    }
};

module.exports = {
    analyzeStudentResume,
    refreshStudentResumeAnalysis,
    fetchPlacementRecommendation,
    getResumeSkillGapAnalysis,
    getResumeLearningRecommendations
};
