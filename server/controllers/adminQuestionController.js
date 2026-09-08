const QuestionBank = require("../models/QuestionBank");
const { successResponse, errorResponse } = require("../utils/response");
const { createPreview, getPreview, deletePreview, validateForImport } = require("../services/questionUploadService");

const uploadQuestions = async (req, res) => {
    try { return successResponse(res, { message: "Questions extracted for review", data: await createPreview(req.file) }); }
    catch (error) { return errorResponse(res, { message: error.message || "Unable to process question file", status: 400 }); }
};

const importQuestions = async (req, res) => {
    try {
        const preview = getPreview(req.body?.previewToken);
        if (!preview) return errorResponse(res, { message: "Preview expired. Upload the file again.", status: 400 });
        const questions = validateForImport(req.body.questions || preview.questions).filter((question) => question.valid);
        if (!questions.length) return errorResponse(res, { message: "There are no valid questions to import.", status: 400 });
        const created = await QuestionBank.insertMany(questions.map((question) => ({
            title: question.question.slice(0, 120), subject: question.subject || "Imported Questions", topic: question.topic || "General",
            difficulty: ["Easy", "Medium", "Hard"].includes(question.difficulty) ? question.difficulty : "Medium", marks: 1,
            question: question.question, options: question.options, correctAnswer: question.correctAnswer, explanation: question.explanation || "", questionType: "MCQ"
        })));
        deletePreview(req.body.previewToken);
        return successResponse(res, { status: 201, message: `${created.length} questions imported successfully`, data: { count: created.length, questionIds: created.map((question) => question._id), questions: created } });
    } catch (error) { return errorResponse(res, { message: error.message || "Unable to import questions", status: error.name === "ValidationError" ? 400 : 500 }); }
};

module.exports = { uploadQuestions, importQuestions };