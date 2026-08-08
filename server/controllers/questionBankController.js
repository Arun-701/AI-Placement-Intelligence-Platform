const mongoose = require("mongoose");
const QuestionBank = require("../models/QuestionBank");

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

        const { createdBy, isActive, ...questionData } = req.body;
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
