const fs = require("fs").promises;
const path = require("path");
const mongoose = require("mongoose");
const mammoth = require("mammoth");
const { PDFParse } = require("pdf-parse");
const Assessment = require("../models/Assessment");
const QuestionBank = require("../models/QuestionBank");
const Faculty = require("../models/Faculty");
const { generateAIResponse } = require("../services/geminiService");
const { successResponse, errorResponse } = require("../utils/response");

const extractMaterial = async (req, res) => {
  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    const buffer = await fs.readFile(req.file.path);
    let text = "";
    if (ext === ".pdf") {
      if (buffer.slice(0, 4).toString() !== "%PDF") throw new Error("Uploaded file is not a valid PDF");
      const parser = new PDFParse({ data: buffer });
      text = (await parser.getText())?.text || "";
      await parser.destroy();
    } else if (ext === ".docx") text = (await mammoth.extractRawText({ buffer })).value || "";
    else throw new Error("Legacy .doc files cannot be reliably extracted. Please save the document as .docx or PDF.");
    text = text.replace(/\s+/g, " ").trim();
    if (text.length < 40) throw new Error("No readable text was found in this document.");
    return successResponse(res, { message: "Material extracted successfully", data: { text: text.slice(0, 60000), fileName: req.file.originalname } });
  } catch (error) { return errorResponse(res, { message: error.message || "Unable to extract document text", status: 400 }); }
};

const generateQuestions = async (req, res) => {
  try {
    const sourceText = String(req.body?.sourceText || "").trim();
    if (sourceText.length < 40) return errorResponse(res, { message: "Extracted learning material is required", status: 400 });
    const prompt = `Create 5 to 10 MCQ questions only from the learning material below. Return ONLY a JSON array. Each item must have question, options (exactly 4), correctAnswer (the exact option text), explanation, difficulty (Easy|Medium|Hard), marks (number), topic. Do not use knowledge not in the material.\n\nMATERIAL:\n${sourceText.slice(0, 50000)}`;
    const raw = await generateAIResponse(prompt, "You generate accurate educational assessment questions grounded strictly in supplied material.");
    const start = raw.indexOf("["); const end = raw.lastIndexOf("]");
    if (start < 0 || end <= start) throw new Error("AI returned an invalid question format");
    const questions = JSON.parse(raw.slice(start, end + 1)).filter((q) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length === 4 && q.options.includes(q.correctAnswer)).map((q) => ({ ...q, difficulty: ["Easy", "Medium", "Hard"].includes(q.difficulty) ? q.difficulty : "Medium", marks: Math.max(1, Number(q.marks) || 1) }));
    if (!questions.length) throw new Error("AI did not generate valid questions from the material");
    return successResponse(res, { message: "Questions generated for review", data: { questions } });
  } catch (error) { return errorResponse(res, { message: error.message || "Question generation failed", status: 502 }); }
};

const getStudents = async (req, res) => {
  const faculty = await Faculty.findById(req.user.id).populate("assignedStudents", "name email department year");
  return successResponse(res, { data: faculty?.assignedStudents || [] });
};

const createAssessment = async (req, res) => {
  try {
    const { title, description = "", duration = 60, passingMarks = 0, questions, studentIds } = req.body || {};
    if (!title || !Array.isArray(questions) || !questions.length) return errorResponse(res, { message: "Title and at least one reviewed question are required", status: 400 });
    const faculty = await Faculty.findById(req.user.id).select("assignedStudents");
    const allowed = new Set((faculty?.assignedStudents || []).map(String));
    if (!Array.isArray(studentIds) || !studentIds.length || !studentIds.every((id) => allowed.has(String(id)))) return errorResponse(res, { message: "Assessments can only be assigned to your assigned students", status: 403 });
    const createdQuestions = await QuestionBank.insertMany(questions.map((q) => ({ title, subject: "Faculty Material", topic: q.topic || title, difficulty: q.difficulty || "Medium", marks: Math.max(1, Number(q.marks) || 1), question: q.question, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation || "", questionType: "MCQ", createdBy: req.user.id })));
    const totalMarks = createdQuestions.reduce((sum, q) => sum + q.marks, 0);
    const assessment = await Assessment.create({ title, description, duration: Math.max(1, Number(duration) || 60), passingMarks: Math.min(totalMarks, Math.max(0, Number(passingMarks) || 0)), questions: createdQuestions.map((q) => q._id), assignedStudents: studentIds, assignedFaculty: req.user.id, totalMarks, status: "Published", assessmentType: "Practice" });
    await Faculty.findByIdAndUpdate(req.user.id, { $addToSet: { assignedAssessments: assessment._id } });
    return successResponse(res, { status: 201, message: "Assessment finalized and assigned", data: assessment });
  } catch (error) { return errorResponse(res, { message: error.message, status: error.name === "ValidationError" ? 400 : 500 }); }
};

const getAssessments = async (req, res) => successResponse(res, { data: await Assessment.find({ assignedFaculty: req.user.id, isActive: true }).sort({ createdAt: -1 }).lean() });
module.exports = { extractMaterial, generateQuestions, getStudents, createAssessment, getAssessments };
