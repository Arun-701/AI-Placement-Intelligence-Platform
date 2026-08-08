const mongoose = require("mongoose");
const AssessmentResult = require("../models/AssessmentResult");
const Assessment = require("../models/Assessment");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const QuestionBank = require("../models/QuestionBank");
const { createNotification } = require("../services/notificationService");

const { successResponse, errorResponse } = require("../utils/response");

const sendError = (res, error) => {
    const statusCode = error.name === "ValidationError" ? 400 : 500;
    return errorResponse(res, { message: error.message, status: statusCode });
};

const submitResult = async (req, res) => {
    try {
        const { assessment: assessmentId, answers } = req.body || {};

        if (!mongoose.isValidObjectId(assessmentId)) {
            return errorResponse(res, { message: "Invalid assessment ID", status: 400 });
        }

        if (!mongoose.isValidObjectId(req.user.id)) {
            return errorResponse(res, { message: "Invalid student ID", status: 400 });
        }

        if (!Array.isArray(answers)) {
            return errorResponse(res, { message: "Answers must be an array", status: 400 });
        }

        const assessment = await Assessment.findById(assessmentId);

        if (!assessment) {
            return errorResponse(res, { message: "Assessment not found", status: 404 });
        }

        if (!assessment.isActive || assessment.status !== "Published") {
            return errorResponse(res, { message: "Assessment is not available for submission", status: 400 });
        }

        const studentId = req.user.id.toString();
        const hasExplicitAssignments = Array.isArray(assessment.assignedStudents) && assessment.assignedStudents.length > 0;
        const isAssignedStudent = hasExplicitAssignments
            ? assessment.assignedStudents.some((assignedStudent) => assignedStudent && assignedStudent.toString() === studentId)
            : true;

        if (!assessment.isInitialAssessment && hasExplicitAssignments && !isAssignedStudent) {
            return errorResponse(res, { message: "You are not assigned to this assessment", status: 403 });
        }

        if (assessment.startDate && new Date(assessment.startDate) > new Date()) {
            return errorResponse(res, { message: "Assessment has not started yet", status: 400 });
        }

        if (assessment.endDate && new Date(assessment.endDate) < new Date()) {
            return errorResponse(res, { message: "Assessment has expired", status: 400 });
        }

        const student = await Student.findById(req.user.id);

        if (!student) {
            return errorResponse(res, { message: "Student not found", status: 404 });
        }

        const existingResult = await AssessmentResult.findOne({
            student: req.user.id,
            assessment: assessmentId
        });

        if (existingResult) {
            return errorResponse(res, { message: "Assessment has already been submitted", status: 409 });
        }

        if (assessment.isInitialAssessment && student.initialAssessmentCompleted) {
            return errorResponse(res, { message: "Initial assessment can only be submitted once", status: 409 });
        }

        const submittedQuestionIds = answers.map((answer) => answer.question);

        if (!answers.every(
            (answer) => answer && mongoose.isValidObjectId(answer.question)
        )) {
            return errorResponse(res, { message: "Answers must contain valid question IDs", status: 400 });
        }

        if (!assessment.questions || assessment.questions.length === 0) {
            return errorResponse(res, { message: "Assessment has no questions configured", status: 400 });
        }

        const uniqueSubmittedIds = [...new Set(
            submittedQuestionIds.map((questionId) => questionId.toString())
        )];

        if (uniqueSubmittedIds.length !== submittedQuestionIds.length) {
            return errorResponse(res, { message: "A question can only be answered once", status: 400 });
        }

        if (answers.length !== assessment.questions.length) {
            return errorResponse(res, { message: "All assessment questions must be answered", status: 400 });
        }

        const assessmentQuestionIds = assessment.questions.map((questionId) => questionId.toString());
        const assessmentQuestionSet = new Set(assessmentQuestionIds);

        if (!uniqueSubmittedIds.every((questionId) => assessmentQuestionSet.has(questionId))) {
            return errorResponse(res, { message: "One or more submitted questions do not belong to this assessment", status: 400 });
        }

        const questions = await QuestionBank.find({
            _id: { $in: assessmentQuestionIds }
        }).select("correctAnswer marks topic");

        const questionMap = new Map(
            questions.map((question) => [question._id.toString(), question])
        );

        if (questionMap.size !== new Set(assessmentQuestionIds).size) {
            return errorResponse(res, { message: "One or more assessment questions are unavailable", status: 400 });
        }

        const calculatedAnswers = answers.map((answer) => {
            const question = questionMap.get(answer.question.toString());
            const selectedAnswer = typeof answer.selectedAnswer === "string"
                ? answer.selectedAnswer.trim()
                : "";
            const isCorrect = selectedAnswer === question.correctAnswer;

            return {
                question: question._id,
                selectedAnswer,
                isCorrect,
                marksObtained: isCorrect ? question.marks : 0
            };
        });

        const totalMarks = assessmentQuestionIds.reduce((total, questionId) => {
            return total + questionMap.get(questionId).marks;
        }, 0);
        const score = calculatedAnswers.reduce(
            (total, answer) => total + answer.marksObtained,
            0
        );
        const percentage = totalMarks === 0 ? 0 : Number(((score / totalMarks) * 100).toFixed(2));

        const topicAnalysisMap = new Map();

        calculatedAnswers.forEach((answer) => {
            const question = questionMap.get(answer.question.toString());
            const topic = question.topic || "General";
            const existingTopic = topicAnalysisMap.get(topic) || {
                topic,
                correctAnswers: 0,
                totalQuestions: 0,
                score: 0,
                totalMarks: 0,
                accuracy: 0
            };

            existingTopic.totalQuestions += 1;
            existingTopic.score += answer.marksObtained;
            existingTopic.totalMarks += question.marks;
            existingTopic.correctAnswers += answer.isCorrect ? 1 : 0;
            existingTopic.accuracy = existingTopic.totalQuestions === 0
                ? 0
                : Number(((existingTopic.correctAnswers / existingTopic.totalQuestions) * 100).toFixed(2));
            topicAnalysisMap.set(topic, existingTopic);
        });

        const topicAnalysis = Array.from(topicAnalysisMap.values()).map((topicEntry) => ({
            ...topicEntry,
            accuracy: Number(topicEntry.accuracy.toFixed(2))
        }));

        const strengths = topicAnalysis
            .filter((topicEntry) => topicEntry.accuracy >= 70)
            .map((topicEntry) => topicEntry.topic);
        const weaknesses = topicAnalysis
            .filter((topicEntry) => topicEntry.accuracy < 50)
            .map((topicEntry) => topicEntry.topic);
        const recommendations = weaknesses.length > 0
            ? weaknesses.map((topic) => `Revise ${topic} concepts thoroughly`)
            : ["Maintain current practice routine"];

        const result = await AssessmentResult.create({
            student: student._id,
            assessment: assessment._id,
            score,
            totalMarks,
            percentage,
            answers: calculatedAnswers,
            strengths,
            weaknesses,
            recommendations,
            topicAnalysis,
            submittedAt: new Date(),
            completed: true
        });

        if (assessment.isInitialAssessment) {
            student.initialAssessmentCompleted = true;
            student.initialAssessmentResult = result._id;
        }

        if (!student.baselineAssessment || !student.baselineAssessment.assessmentId) {
            student.baselineAssessment = {
                assessmentId: assessment._id,
                resultId: result._id,
                score,
                totalMarks,
                percentage,
                submittedAt: result.submittedAt,
                strengths,
                weaknesses,
                topicAnalysis,
            };
        }

        await student.save();

        if (assessment.assignedFaculty) {
            try {
                await createNotification({
                    recipient: assessment.assignedFaculty.toString(),
                    recipientType: "faculty",
                    title: `Assessment submitted: ${assessment.title}`,
                    message: `Student ${student.name} submitted the assessment '${assessment.title}' for your review.`,
                    type: "Assessment Submitted",
                    priority: "High",
                    referenceId: result._id,
                    referenceModel: "AssessmentResult"
                });
            } catch (notificationError) {
                console.error("Notification creation failed:", notificationError.message);
            }
        }

        return successResponse(res, { status: 201, message: "Assessment result submitted successfully", data: result });
    } catch (error) {
        sendError(res, error);
    }
};

const getMyResults = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.user.id)) {
            return errorResponse(res, { message: "Invalid student ID", status: 400 });
        }

        const student = await Student.findById(req.user.id);

        if (!student) {
            return errorResponse(res, { message: "Student not found", status: 404 });
        }

        const results = await AssessmentResult.find({
            student: req.user.id,
            completed: true
        }).populate("assessment").sort({ submittedAt: -1 });

        const historySummary = {
            totalAssessments: results.length,
            averagePercentage: results.length === 0
                ? 0
                : Number((results.reduce((total, result) => total + result.percentage, 0) / results.length).toFixed(2)),
            latestAssessment: results[0] || null,
            baselineAssessment: student.baselineAssessment || null
        };

        return successResponse(res, { message: "Student results fetched successfully", data: { results, historySummary } });
    } catch (error) {
        sendError(res, error);
    }
};

const getAssessmentResults = async (req, res) => {
    try {
        const { assessmentId } = req.params;

        if (!mongoose.isValidObjectId(assessmentId)) {
            return errorResponse(res, { message: "Invalid assessment ID", status: 400 });
        }

        const assessment = await Assessment.findById(assessmentId);

        if (!assessment) {
            return errorResponse(res, { message: "Assessment not found", status: 404 });
        }

        if (assessment.assignedFaculty && req.user.id !== assessment.assignedFaculty.toString()) {
            return errorResponse(res, { message: "You are not authorized to view these results", status: 403 });
        }

        const results = await AssessmentResult.find({
            assessment: assessmentId,
            completed: true
        }).populate("student");

        return successResponse(res, { message: "Assessment results fetched successfully", data: results });
    } catch (error) {
        sendError(res, error);
    }
};

const getResultById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return errorResponse(res, { message: "Invalid result ID", status: 400 });
        }

        const result = await AssessmentResult.findById(req.params.id)
            .populate("student")
            .populate("assessment")
            .populate("answers.question");

        if (!result) {
            return errorResponse(res, { message: "Assessment result not found", status: 404 });
        }

        if (req.user.role === "student") {
            const isOwner = result.student && result.student._id.toString() === req.user.id;
                if (!isOwner) {
                return errorResponse(res, { message: "You are not authorized to view this result", status: 403 });
            }
        }

        if (req.user.role === "faculty") {
            const assessment = result.assessment;
            const isAssignedFaculty = assessment && assessment.assignedFaculty && assessment.assignedFaculty.toString() === req.user.id;
            if (!isAssignedFaculty) {
                return errorResponse(res, { message: "You are not authorized to view this result", status: 403 });
            }
        }

        return successResponse(res, { message: "Assessment result fetched successfully", data: result });
    } catch (error) {
        sendError(res, error);
    }
};

const updateFeedback = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return errorResponse(res, { message: "Invalid result ID", status: 400 });
        }

        const faculty = await Faculty.findById(req.user.id);

        if (!faculty) {
            return errorResponse(res, { message: "Only faculty can update result feedback", status: 403 });
        }

        const allowedFields = ["feedback", "strengths", "weaknesses", "recommendations"];
        const requestFields = Object.keys(req.body || {});

        if (requestFields.some((field) => !allowedFields.includes(field))) {
            return errorResponse(res, { message: "Invalid field(s) provided.", status: 400 });
        }

        if (requestFields.length === 0) {
            return errorResponse(res, { message: "No feedback fields provided", status: 400 });
        }

        const updates = req.body;

        if (updates.feedback !== undefined && typeof updates.feedback !== "string") {
            return errorResponse(res, { message: "Feedback must be a string", status: 400 });
        }

        const analysisFields = ["strengths", "weaknesses", "recommendations"];

        for (const field of analysisFields) {
            if (updates[field] !== undefined && (!Array.isArray(updates[field]) || !updates[field].every(
                (value) => typeof value === "string" && value.trim().length > 0
            ))) {
                return errorResponse(res, { message: `${field} must be an array of non-empty strings`, status: 400 });
            }
        }

        const result = await AssessmentResult.findById(req.params.id);

        if (!result) {
            return errorResponse(res, { message: "Assessment result not found", status: 404 });
        }

        const assessment = await Assessment.findById(result.assessment);

        if (!assessment || !assessment.assignedFaculty || assessment.assignedFaculty.toString() !== req.user.id) {
            return errorResponse(res, { message: "You are not authorized to update this feedback", status: 403 });
        }

        Object.assign(result, updates);
        await result.save();

        try {
            await createNotification({
                recipient: result.student.toString(),
                recipientType: "student",
                title: `Assessment evaluated: ${result.assessment.title}`,
                message: `Your assessment '${result.assessment.title}' has been evaluated. Please check your result details.`,
                type: "Assessment Result",
                priority: "Medium",
                referenceId: result._id,
                referenceModel: "AssessmentResult"
            });
        } catch (notificationError) {
            console.error("Notification creation failed:", notificationError.message);
        }

        return successResponse(res, { message: "Assessment result feedback updated successfully", data: result });
    } catch (error) {
        sendError(res, error);
    }
};

module.exports = {
    submitResult,
    getMyResults,
    getAssessmentResults,
    getResultById,
    updateFeedback
};
