const {
    getAssignedAssessments,
    startAssessment,
    autoSaveAttempt,
    submitAssessment,
    getAssessmentHistory,
    getAssessmentResult
} = require("../services/assessmentAttemptService");
const mongoose = require("mongoose");
const Assessment = require("../models/Assessment");
const Student = require("../models/Student");
const AssessmentResult = require("../models/AssessmentResult");
const AssessmentAttendanceRequest = require("../models/AssessmentAttendanceRequest");
const ReattemptAssignment = require("../models/ReattemptAssignment");
const { getAssessmentVisibility } = require("../utils/assessmentVisibility");
const { getAssessmentAssignmentDates } = require("../utils/assessmentAssignmentDates");
const { getStudentReadinessScore } = require("../services/readinessService");
const { createAdminStudentRequestNotifications } = require("../services/notificationService");
const { getReattemptSetAvailability } = require("../utils/reattemptSetAvailability");
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

const requestToAttend = async (req, res) => {
    try {
        const { id: assessmentId } = req.params;
        const studentId = req.user.id;

        if (!mongoose.isValidObjectId(assessmentId)) {
            return errorResponse(res, { message: "Invalid assessment ID", status: 400 });
        }

        const assessment = await Assessment.findOne({
            _id: assessmentId,
            isActive: true,
            status: "Published",
            isInitialAssessment: { $ne: true },
        });
        if (!assessment) return errorResponse(res, { message: "Assessment not found", status: 404 });

        let originalAssignment = assessment._id;
        let originalAssignmentType = "assessment";
        let setIndex = 0;
        let assignment = null;
        if (assessment.usesMultiSetAssignment) {
            assignment = (assessment.setAssignments || []).find((entry) =>
                (entry.assignedStudents || []).some((assigned) => assigned.toString() === studentId)
            );
            if (!assignment) return errorResponse(res, { message: "You are not assigned to this assessment", status: 403 });
            originalAssignment = assignment._id;
            originalAssignmentType = "set-assignment";
            setIndex = Number(assignment.setIndex);
        } else if (!(assessment.assignedStudents || []).some((assigned) => assigned.toString() === studentId)) {
            return errorResponse(res, { message: "You are not assigned to this assessment", status: 403 });
        }
        const { endDate } = getAssessmentAssignmentDates(assessment, assignment, setIndex);
        if (!endDate || new Date(endDate) >= new Date()) {
            return errorResponse(res, { message: "This assessment is still available. Attend it before requesting another opportunity.", status: 400 });
        }
        if (!getAssessmentVisibility(endDate).withinRequestWindow) {
            return errorResponse(res, { message: "The 24-hour request window for this assessment has passed.", status: 400 });
        }
        const previousReattemptAssignments = await ReattemptAssignment.find({
            assessment: assessmentId,
            students: studentId,
        }).select("assessment students setIndex").lean();
        const retestAvailability = getReattemptSetAvailability({
            assessment,
            studentIds: [studentId],
            previousReattemptAssignments,
            originalAssignments: [{ student: studentId, setIndex }],
        });
        if (!retestAvailability.availableSetIndexes.length) {
            return errorResponse(res, {
                message: "No Retest Available. There are no remaining question sets available for this student.",
                status: 409,
            });
        }

        const student = await Student.findById(studentId).select("name currentAttempt");
        if (student?.currentAttempt?.assessmentId?.toString() === assessmentId &&
            student.currentAttempt.status === "in-progress") {
            if (!student.currentAttempt.dueAt || new Date(student.currentAttempt.dueAt) > new Date()) {
                return errorResponse(res, { message: "An assessment attempt is already in progress", status: 409 });
            }
            student.currentAttempt.status = "expired";
            await student.save();
        }

        const completedResult = await AssessmentResult.exists({ student: studentId, assessment: assessmentId });
        if (completedResult) {
            return errorResponse(res, { message: "Completed assessments cannot be requested for attendance", status: 409 });
        }

        const existingRequest = await AssessmentAttendanceRequest.findOne({
            student: studentId,
            assessment: assessmentId,
            active: { $ne: false },
        });
        if (existingRequest) {
            if (existingRequest.status === "Cancelled") {
                return errorResponse(res, {
                    message: "Your retest request was cancelled and cannot be continued.",
                    status: 409,
                });
            }
            if (existingRequest.status !== "Requested") {
                return errorResponse(res, {
                    message: "This retest request has already been handled.",
                    status: 409,
                });
            }
            try {
                await createAdminStudentRequestNotifications({
                    request: existingRequest,
                    assessment,
                    student,
                });
            } catch (notificationError) {
                console.error("Student request notification creation failed:", notificationError.message);
                return errorResponse(res, { message: "Your request is saved, but administrator notification delivery failed. Please retry.", status: 500 });
            }
            return successResponse(res, {
                message: "Your attendance request is already active",
                data: existingRequest,
            });
        }

        const activeAssignment = await ReattemptAssignment.exists({
            assessment: assessmentId,
            students: studentId,
            active: true,
        });
        if (activeAssignment) {
            return errorResponse(res, { message: "A re-attempt is already assigned", status: 409 });
        }

        const attendanceRequest = await AssessmentAttendanceRequest.create({
            student: studentId,
            assessment: assessmentId,
            originalAssignment,
            originalAssignmentType,
            setIndex,
        });
        try {
            await createAdminStudentRequestNotifications({
                request: attendanceRequest,
                assessment,
                student,
            });
        } catch (notificationError) {
            console.error("Student request notification creation failed:", notificationError.message);
            return errorResponse(res, { message: "Your request is saved, but administrator notification delivery failed. Please retry.", status: 500 });
        }

        return successResponse(res, {
            status: 201,
            message: "Request to attend submitted successfully",
            data: attendanceRequest,
        });
    } catch (error) {
        if (error.code === 11000) {
            return errorResponse(res, { message: "An active attendance request already exists", status: 409 });
        }
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
            error.message.includes("already attempted") || error.message.includes("already completed this re-attempt") ? 409 :
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
    requestToAttend,
    startAssessmentAttempt,
    autoSaveAssessmentAttempt,
    submitAssessmentAttempt,
    getMyAssessmentHistory,
    getMyAssessmentResult,
    getReadinessScore
};
