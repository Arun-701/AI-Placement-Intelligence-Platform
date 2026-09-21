const mongoose = require("mongoose");

const generatedQuestionSchema = new mongoose.Schema({
    questionId: { type: String, required: true },
    domain: { type: String, required: true, trim: true },
    milestone: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    questionType: { type: String, enum: ["MCQ"], default: "MCQ" },
    question: { type: String, required: true, trim: true },
    options: { type: [{ type: String, trim: true }], required: true },
    correctAnswer: { type: String, required: true, trim: true, select: false },
    explanation: { type: String, required: true, trim: true, select: false },
    selectedAnswer: { type: String, trim: true, default: "" },
    isCorrect: { type: Boolean, default: null },
}, { _id: false });

const adaptiveAssessmentSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: "Roadmap", required: true },
    domain: { type: String, required: true, trim: true },
    assessmentMode: { type: String, enum: ["overall", "milestone"], required: true },
    milestoneId: { type: mongoose.Schema.Types.ObjectId, default: null },
    milestone: { type: String, trim: true, default: "" },
    title: { type: String, required: true, trim: true },
    questions: { type: [generatedQuestionSchema], default: [] },
    readinessSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    status: { type: String, enum: ["generated", "in-progress", "completed"], default: "generated" },
}, { timestamps: true });

module.exports = mongoose.model("AdaptiveAssessment", adaptiveAssessmentSchema);
