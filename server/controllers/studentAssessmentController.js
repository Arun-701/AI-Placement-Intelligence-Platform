const {
    getAssignedAssessments,
    startAssessment,
    autoSaveAttempt,
    submitAssessment,
    getAssessmentHistory,
    getAssessmentResult
} = require("../services/assessmentAttemptService");
const { getStudentReadinessScore } = require("../services/readinessService");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * GET /api/assessment/my
 * Get all assigned assessments for the logged-in student
 */
const getMyAssessments = async (req, res) => {
    try {
        const studentId = req.user.id;
        const assessments = await getAssignedAssessments(studentId);

        return successResponse(res, {
            message: "Assessments fetched successfully",
            data: {
                count: assessments.length,
                assessments
            }
        });
    } catch (error) {
        console.error(error);
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

/**
 * POST /api/assessment/:id/start
 * Start an assessment and get questions
 */
const startAssessmentAttempt = async (req, res) => {
    try {
        const { id: assessmentId } = req.params;
        const studentId = req.user.id;

        const assessmentData = await startAssessment(studentId, assessmentId);

        return successResponse(res, {
            message: "Assessment started successfully",
            data: assessmentData,
            status: 200
        });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.includes("not found") ? 404 : error.message.includes("deactivated") ? 403 : 400;
        return errorResponse(res, { message: error.message, status: statusCode });
    }
};

/**
 * POST /api/assessment/:id/auto-save
 * Auto-save assessment attempt
 */
const autoSaveAssessmentAttempt = async (req, res) => {
    try {
        const { id: assessmentId } = req.params;
        const studentId = req.user.id;
        const { answers, timeSpent } = req.body;

        if (!answers || !Array.isArray(answers)) {
            return errorResponse(res, { message: "Answers array is required", status: 400 });
        }

        if (typeof timeSpent !== "number" || timeSpent < 0) {
            return errorResponse(res, { message: "Valid timeSpent is required", status: 400 });
        }

        const saveData = await autoSaveAttempt(studentId, {
            assessment: assessmentId,
            answers,
            timeSpent
        });

        return successResponse(res, {
            message: "Assessment auto-saved successfully",
            data: saveData
        });
    } catch (error) {
        console.error(error);
        return errorResponse(res, { message: error.message, status: 400 });
    }
};

/**
 * POST /api/assessment/:id/submit
 * Submit assessment for evaluation
 */
const submitAssessmentAttempt = async (req, res) => {
    try {
        const { id: assessmentId } = req.params;
        const studentId = req.user.id;
        const { answers, timeTaken = 0 } = req.body;

        if (!answers || !Array.isArray(answers)) {
            return errorResponse(res, { message: "Answers array is required", status: 400 });
        }

        if (typeof timeTaken !== "number" || timeTaken < 0) {
            return errorResponse(res, { message: "Valid timeTaken is required", status: 400 });
        }

        const result = await submitAssessment(studentId, assessmentId, answers, timeTaken);

        return successResponse(res, {
            message: result.message,
            data: result,
            status: 201
        });
    } catch (error) {
        console.error(error);
        const statusCode = 
            error.message.includes("not found") ? 404 :
            error.message.includes("deactivated") ? 403 :
            error.message.includes("already attempted") ? 409 :
            400;
        return errorResponse(res, { message: error.message, status: statusCode });
    }
};

/**
 * GET /api/assessment/history
 * Get student's assessment attempt history
 */
const getMyAssessmentHistory = async (req, res) => {
    try {
        const studentId = req.user.id;
        const history = await getAssessmentHistory(studentId);

        return successResponse(res, {
            message: "Assessment history fetched successfully",
            data: {
                count: history.length,
                assessments: history
            }
        });
    } catch (error) {
        console.error(error);
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

/**
 * GET /api/assessment/result/:resultId
 * Get detailed assessment result
 */
const getMyAssessmentResult = async (req, res) => {
    try {
        const { resultId } = req.params;
        const studentId = req.user.id;

        const result = await getAssessmentResult(studentId, resultId);

        return successResponse(res, {
            message: "Assessment result fetched successfully",
            data: result
        });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.includes("not found") ? 404 : error.message.includes("Unauthorized") ? 403 : 500;
        return errorResponse(res, { message: error.message, status: statusCode });
    }
};

/**
 * GET /api/student/readiness
 * Get student's placement readiness score
 */
const getReadinessScore = async (req, res) => {
    try {
        const studentId = req.user.id;
        const readinessData = await getStudentReadinessScore(studentId);

        return successResponse(res, {
            message: "Readiness score fetched successfully",
            data: readinessData
        });
    } catch (error) {
        console.error(error);
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

module.exports = {
    getMyAssessments,
    startAssessmentAttempt,
    autoSaveAssessmentAttempt,
    submitAssessmentAttempt,
    getMyAssessmentHistory,
    getMyAssessmentResult,
    getReadinessScore
};
