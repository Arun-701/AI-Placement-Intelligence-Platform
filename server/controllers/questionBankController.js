const mongoose = require("mongoose");
const QuestionBank = require("../models/QuestionBank");
const Assessment = require("../models/Assessment");

const { errorResponse, successResponse } = require("../utils/response");

const sendError = (res, error) => {
    const statusCode = error.name === "ValidationError" ? 400 : 500;
    return errorResponse(res, { message: error.message, status: statusCode });
};

const createQuestion = async (req, res) => {
    try {
        const { createdBy, ...questionData } = req.body;
        const question = await QuestionBank.create({
            ...questionData,
            createdBy: req.user.id
        });

        return successResponse(res, { status: 201, message: "Question created successfully", data: question });
    } catch (error) {
        sendError(res, error);
    }
};

const getQuestions = async (req, res) => {
    try {
        const filters = { isActive: true };
        const filterFields = ["subject", "topic", "difficulty", "questionType"];

        filterFields.forEach((field) => {
            if (req.query[field]) {
                filters[field] = req.query[field];
            }
        });

        const questions = await QuestionBank.find(filters);

        return successResponse(res, { message: "Questions fetched successfully", data: questions });
    } catch (error) {
        sendError(res, error);
    }
};

const getQuestionById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return errorResponse(res, { message: "Invalid question ID", status: 400 });
        }

        const question = await QuestionBank.findOne({
            _id: req.params.id,
            isActive: true
        });

        if (!question) {
            return errorResponse(res, { message: "Question not found", status: 404 });
        }

        if (req.query.assessmentId) {
            if (!mongoose.isValidObjectId(req.query.assessmentId)) {
                return errorResponse(res, { message: "Invalid assessment ID", status: 400 });
            }
            const assessment = await Assessment.findOne({ _id: req.query.assessmentId, questions: req.params.id });
            if (!assessment) {
                return errorResponse(res, { message: "Question is not linked to this assessment", status: 404 });
            }
            assessment.questions = assessment.questions.filter((questionId) => questionId.toString() !== req.params.id);
            await assessment.save();
        }
        return successResponse(res, { message: "Question fetched successfully", data: question });
    } catch (error) {
        sendError(res, error);
    }
};

const updateQuestion = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return errorResponse(res, { message: "Invalid question ID", status: 400 });
        }

        const question = await QuestionBank.findOne({
            _id: req.params.id,
            isActive: true
        });

        if (!question) {
            return errorResponse(res, { message: "Question not found", status: 404 });
        }

        const editableFields = [
            "question",
            "options",
            "correctAnswer",
            "subject",
            "topic",
            "difficulty",
            "explanation"
        ];
        const questionData = Object.fromEntries(
            editableFields
                .filter((field) => Object.prototype.hasOwnProperty.call(req.body, field))
                .map((field) => [field, req.body[field]])
        );

        if (question.questionType === "MCQ" && Object.keys(questionData).some((field) => ["options", "correctAnswer"].includes(field))) {
            const options = questionData.options ?? question.options;
            const correctAnswer = questionData.correctAnswer ?? question.correctAnswer;

            if (!Array.isArray(options) || options.length !== 4 || options.some((option) => !String(option).trim())) {
                return errorResponse(res, { message: "MCQ questions must include exactly four non-empty options", status: 400 });
            }

            if (!options.map((option) => String(option).trim()).includes(String(correctAnswer).trim())) {
                return errorResponse(res, { message: "Correct answer must match one of the options", status: 400 });
            }
        }

        Object.assign(question, questionData);
        await question.save();

        return successResponse(res, { message: "Question updated successfully", data: question });
    } catch (error) {
        sendError(res, error);
    }
};

const deleteQuestion = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return errorResponse(res, { message: "Invalid question ID", status: 400 });
        }

        const question = await QuestionBank.findOne({
            _id: req.params.id,
            isActive: true
        });

        if (!question) {
            return errorResponse(res, { message: "Question not found", status: 404 });
        }

        const assessmentId = req.query.assessmentId;
        if (assessmentId) {
            if (!mongoose.isValidObjectId(assessmentId)) {
                return errorResponse(res, { message: "Invalid assessment ID", status: 400 });
            }

            const assessment = await Assessment.findOneAndUpdate(
                { _id: assessmentId, questions: question._id },
                {
                    $pull: { questions: question._id },
                    $inc: { totalMarks: -(Number(question.marks) || 1) }
                },
                { new: true }
            );

            if (!assessment) {
                return errorResponse(res, { message: "Question does not belong to this assessment", status: 404 });
            }
        }

        question.isActive = false;
        await question.save();

        return successResponse(res, { message: "Question deleted successfully", data: question });
    } catch (error) {
        sendError(res, error);
    }
};

module.exports = {
    createQuestion,
    getQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion
};
