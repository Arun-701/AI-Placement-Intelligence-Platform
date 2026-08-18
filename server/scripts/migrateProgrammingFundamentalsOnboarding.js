require("dotenv").config();
const mongoose = require("mongoose");
const Assessment = require("../models/Assessment");
const QuestionBank = require("../models/QuestionBank");

const PROGRAMMING_FUNDAMENTALS_TITLE = "Programming Fundamentals Assessment";
const LEGACY_INITIAL_TITLE = "Initial Onboarding Assessment";

const normalizeEmbeddedQuestion = async (question, index) => {
  if (mongoose.isValidObjectId(question)) {
    return question;
  }

  if (!question || typeof question.question !== "string" || !question.question.trim()) {
    throw new Error(`Question ${index + 1} is invalid`);
  }

  const existing = await QuestionBank.findOne({ question: question.question.trim() });
  if (existing) {
    return existing._id;
  }

  const options = Array.isArray(question.options) ? question.options.map((option) => String(option).trim()) : [];
  if (options.length !== 4 || options.some((option) => !option) || !options.includes(question.correctAnswer)) {
    throw new Error(`Question ${index + 1} does not contain a valid MCQ answer set`);
  }

  const created = await QuestionBank.create({
    title: question.title || `Programming Fundamentals ${index + 1}`,
    subject: question.subject || question.category || "Programming Fundamentals",
    topic: question.topic || question.category || "Programming Fundamentals",
    difficulty: ["Easy", "Medium", "Hard"].includes(question.difficulty) ? question.difficulty : "Medium",
    marks: Number(question.marks) > 0 ? Number(question.marks) : 1,
    question: question.question.trim(),
    options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation || "",
    questionType: "MCQ",
    isActive: true
  });
  return created._id;
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const target = await Assessment.findOne({ title: PROGRAMMING_FUNDAMENTALS_TITLE });
  if (!target) {
    throw new Error(`Assessment not found: ${PROGRAMMING_FUNDAMENTALS_TITLE}`);
  }

  const questionIds = await Promise.all((target.questions || []).map(normalizeEmbeddedQuestion));
  if (questionIds.length !== 15) {
    throw new Error(`Expected 15 programming fundamentals questions, found ${questionIds.length}`);
  }
  const questions = await QuestionBank.find({ _id: { $in: questionIds } }).select("marks isActive").lean();
  if (questions.length !== questionIds.length || questions.some((question) => question.isActive === false)) {
    throw new Error("The programming fundamentals assessment contains missing or inactive questions");
  }

  const legacyInitial = await Assessment.findOne({
    title: LEGACY_INITIAL_TITLE,
    isInitialAssessment: true
  });

  if (legacyInitial && legacyInitial._id.toString() !== target._id.toString()) {
    legacyInitial.isInitialAssessment = false;
    legacyInitial.assessmentType = "Practice";
    await legacyInitial.save();
  }

  target.assessmentType = "Initial";
  target.isInitialAssessment = true;
  target.isActive = true;
  target.status = "Published";
  target.questions = questionIds;
  target.totalMarks = questions.reduce((total, question) => total + (Number(question.marks) || 0), 0);
  target.duration = target.duration || 30;
  target.passingMarks = Math.min(target.passingMarks || 0, target.totalMarks);
  await target.save();

  console.log(`Configured ${PROGRAMMING_FUNDAMENTALS_TITLE} as the onboarding assessment with ${questionIds.length} questions.`);
};

run()
  .catch((error) => {
    console.error("Onboarding assessment migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
