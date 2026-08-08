const mongoose = require("mongoose");
const Assessment = require("../models/Assessment");
const Faculty = require("../models/Faculty");
const QuestionBank = require("../models/QuestionBank");
const Student = require("../models/Student");
const { createBulkNotification } = require("../services/notificationService");

const { errorResponse, successResponse } = require("../utils/response");

const sendError = (res, error) => {
    const statusCode = error.name === "ValidationError" ? 400 : 500;
    return errorResponse(res, { message: error.message, status: statusCode });
};

const normalizeAssessmentData = (assessmentData) => {
    const data = { ...(assessmentData || {}) };

    if (data.assessmentType === "Initial" || data.isInitialAssessment === true) {
        data.isInitialAssessment = true;
        data.assessmentType = "Initial";
    }

    return data;
};

const validateAssignments = async (assessmentData, requireFaculty = false) => {
    if (Object.prototype.hasOwnProperty.call(assessmentData, "questions") && Array.isArray(assessmentData.questions)) {
        if (assessmentData.questions.length === 0) {
            return "At least one question is required";
        }
    }

    const hasFaculty = Object.prototype.hasOwnProperty.call(assessmentData, "assignedFaculty");

    if (requireFaculty && !hasFaculty) {
        return "Assigned faculty is required";
    }

    if (hasFaculty) {
        if (!mongoose.isValidObjectId(assessmentData.assignedFaculty)) {
            return "Invalid assigned faculty ID";
        }

        const facultyExists = await Faculty.exists({ _id: assessmentData.assignedFaculty });

        if (!facultyExists) {
            return "Assigned faculty not found";
        }
    }

    if (Object.prototype.hasOwnProperty.call(assessmentData, "questions")) {
        if (!Array.isArray(assessmentData.questions) || !assessmentData.questions.every(
            (questionId) => mongoose.isValidObjectId(questionId)
        )) {
            return "Questions must be an array of valid question IDs";
        }

        const questionIds = [...new Set(assessmentData.questions.map((questionId) => questionId.toString()))];
        const activeQuestions = await QuestionBank.countDocuments({
            _id: { $in: questionIds },
            isActive: true
        });

        if (activeQuestions !== questionIds.length) {
            return "One or more questions are invalid or inactive";
        }
    }

    if (Object.prototype.hasOwnProperty.call(assessmentData, "assignedStudents")) {
        if (!Array.isArray(assessmentData.assignedStudents) || !assessmentData.assignedStudents.every(
            (studentId) => mongoose.isValidObjectId(studentId)
        )) {
            return "Assigned students must be an array of valid student IDs";
        }

        const studentIds = [...new Set(assessmentData.assignedStudents.map((studentId) => studentId.toString()))];
        const studentCount = await Student.countDocuments({
            _id: { $in: studentIds }
        });

        if (studentCount !== studentIds.length) {
            return "One or more assigned students were not found";
        }
    }

    return null;
};

const createAssessment = async (req, res) => {
    try {
        const assessmentData = normalizeAssessmentData(req.body || {});
        const validationError = await validateAssignments(assessmentData, true);

        if (assessmentData.assignedStudents && assessmentData.assignedStudents.length > 0 && assessmentData.isInitialAssessment) {
            return errorResponse(res, { message: "Initial assessments cannot be assigned to specific students", status: 400 });
        }

        if (validationError) {
            return errorResponse(res, { message: validationError, status: 400 });
        }

        if (assessmentData.isInitialAssessment) {
            const existingInitialAssessment = await Assessment.findOne({
                isInitialAssessment: true,
                isActive: true
            });

            if (existingInitialAssessment) {
                return errorResponse(res, { message: "An initial assessment already exists", status: 409 });
            }
        }

        if (Array.isArray(assessmentData.questions) && assessmentData.questions.length > 0) {
            const questionMarks = await QuestionBank.find(
                { _id: { $in: assessmentData.questions } },
                { marks: 1 }
            );
            assessmentData.totalMarks = questionMarks.reduce(
                (total, question) => total + (Number(question.marks) || 0),
                0
            );
        }

        const assessment = await Assessment.create(assessmentData);

        try {
            const recipients = Array.isArray(assessment.assignedStudents) && assessment.assignedStudents.length > 0
                ? assessment.assignedStudents.map((id) => id.toString())
                : [];

            if (recipients.length > 0) {
                await createBulkNotification({
                    recipientType: "student",
                    recipientIds: recipients,
                    title: `Assessment assigned: ${assessment.title}`,
                    message: `You have been assigned to the assessment '${assessment.title}'. Please review and prepare accordingly.`,
                    type: "Assessment Assigned",
                    priority: "High",
                    referenceId: assessment._id,
                    referenceModel: "Assessment"
                });
            }

            if (assessment.status === "Published") {
                await createBulkNotification({
                    recipientType: "student",
                    recipientIds: recipients.length > 0 ? recipients : undefined,
                    title: `Assessment published: ${assessment.title}`,
                    message: `The assessment '${assessment.title}' has been published and is available for students.`,
                    type: "Assessment Published",
                    priority: "High",
                    referenceId: assessment._id,
                    referenceModel: "Assessment"
                });
            }
        } catch (notificationError) {
            console.error("Notification creation failed:", notificationError.message);
        }

        return successResponse(res, { status: 201, message: "Assessment created successfully", data: assessment });
    } catch (error) {
        sendError(res, error);
    }
};

const getAssessments = async (req, res) => {
    try {
        const filters = { isActive: true };
        const filterFields = ["assessmentType", "status"];

        filterFields.forEach((field) => {
            if (req.query[field]) {
                filters[field] = req.query[field];
            }
        });

        const assessments = await Assessment.find(filters);

        return successResponse(res, { message: "Assessments fetched successfully", data: assessments });
    } catch (error) {
        sendError(res, error);
    }
};

const getInitialAssessment = async (req, res) => {
    try {
        const assessment = await Assessment.findOne({
            isInitialAssessment: true,
            isActive: true,
            status: "Published"
        })
            .populate("questions")
            .populate("assignedFaculty");

        if (!assessment) {
            return errorResponse(res, { message: "Initial assessment not found", status: 404 });
        }

        return successResponse(res, { message: "Initial assessment fetched successfully", data: assessment });
    } catch (error) {
        sendError(res, error);
    }
};

const getAssessmentById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return errorResponse(res, { message: "Invalid assessment ID", status: 400 });
        }

        const assessment = await Assessment.findOne({
            _id: req.params.id,
            isActive: true
        })
            .populate("questions")
            .populate("assignedStudents")
            .populate("assignedFaculty");

        if (!assessment) {
            return errorResponse(res, { message: "Assessment not found", status: 404 });
        }

        return successResponse(res, { message: "Assessment fetched successfully", data: assessment });
    } catch (error) {
        sendError(res, error);
    }
};

const updateAssessment = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return errorResponse(res, { message: "Invalid assessment ID", status: 400 });
        }

        const assessment = await Assessment.findOne({
            _id: req.params.id,
            isActive: true
        });

        if (!assessment) {
            return errorResponse(res, { message: "Assessment not found", status: 404 });
        }

        const { _id, isActive, ...assessmentData } = req.body || {};
        const normalizedAssessmentData = normalizeAssessmentData(assessmentData);
        const validationError = await validateAssignments(normalizedAssessmentData);

        if (validationError) {
            return errorResponse(res, { message: validationError, status: 400 });
        }

        if (normalizedAssessmentData.isInitialAssessment) {
            const duplicateInitialAssessment = await Assessment.findOne({
                _id: { $ne: assessment._id },
                isInitialAssessment: true,
                isActive: true
            });

            if (duplicateInitialAssessment) {
                return errorResponse(res, { message: "An initial assessment already exists", status: 409 });
            }
        }

        const originalAssignedStudents = Array.isArray(assessment.assignedStudents)
            ? assessment.assignedStudents.map((id) => id.toString())
            : [];
        const originalStatus = assessment.status;

        Object.assign(assessment, normalizedAssessmentData);

        if (Array.isArray(assessment.questions) && assessment.questions.length > 0) {
            const questionMarks = await QuestionBank.find(
                { _id: { $in: assessment.questions } },
                { marks: 1 }
            );
            assessment.totalMarks = questionMarks.reduce(
                (total, question) => total + (Number(question.marks) || 0),
                0
            );
        } else {
            assessment.totalMarks = 0;
        }

        await assessment.save();

        try {
            if (Array.isArray(normalizedAssessmentData.assignedStudents)) {
                const updatedAssignedStudents = normalizedAssessmentData.assignedStudents.map((id) => id.toString());
                const newStudentIds = updatedAssignedStudents.filter(
                    (studentId) => !originalAssignedStudents.includes(studentId)
                );

                if (newStudentIds.length > 0) {
                    await createBulkNotification({
                        recipientType: "student",
                        recipientIds: newStudentIds,
                        title: `Assessment assigned: ${assessment.title}`,
                        message: `You have been assigned to the assessment '${assessment.title}'. Please review it now.`,
                        type: "Assessment Assigned",
                        priority: "High",
                        referenceId: assessment._id,
                        referenceModel: "Assessment"
                    });
                }
            }

            if (normalizedAssessmentData.status === "Published" && originalStatus !== "Published") {
                const recipients = Array.isArray(assessment.assignedStudents) && assessment.assignedStudents.length > 0
                    ? assessment.assignedStudents.map((id) => id.toString())
                    : undefined;

                await createBulkNotification({
                    recipientType: "student",
                    recipientIds: recipients,
                    title: `Assessment published: ${assessment.title}`,
                    message: `The assessment '${assessment.title}' has been published and is now available for students.`,
                    type: "Assessment Published",
                    priority: "High",
                    referenceId: assessment._id,
                    referenceModel: "Assessment"
                });
            }
        } catch (notificationError) {
            console.error("Notification creation failed:", notificationError.message);
        }

        return successResponse(res, { message: "Assessment updated successfully", data: assessment });
    } catch (error) {
        sendError(res, error);
    }
};

const deleteAssessment = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return errorResponse(res, { message: "Invalid assessment ID", status: 400 });
        }

        const assessment = await Assessment.findOne({
            _id: req.params.id,
            isActive: true
        });

        if (!assessment) {
            return errorResponse(res, { message: "Assessment not found", status: 404 });
        }

        assessment.isActive = false;
        await assessment.save();

        return successResponse(res, { message: "Assessment deleted successfully", data: assessment });
    } catch (error) {
        sendError(res, error);
    }
};

module.exports = {
    createAssessment,
    getAssessments,
    getInitialAssessment,
    getAssessmentById,
    updateAssessment,
    deleteAssessment
};
