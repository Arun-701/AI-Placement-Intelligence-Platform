const fs = require("fs").promises;
const path = require("path");
const mongoose = require("mongoose");
const mammoth = require("mammoth");
const { PDFParse } = require("pdf-parse");
const Assessment = require("../models/Assessment");
const QuestionBank = require("../models/QuestionBank");
const AssessmentResult = require("../models/AssessmentResult");
const Faculty = require("../models/Faculty");
const { parseQuestionPaper } = require("../services/questionPaperParser");
const { extractPdfTextWithOcr } = require("../services/questionPaperOcrService");
const { successResponse, errorResponse } = require("../utils/response");

const meaningfulText = (value) => String(value || "").replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "").replace(/\s+/g, "").trim();

const extractMaterial = async (req, res) => {
  let stage = "request";
  try {
    console.log("--------------------------------");
    console.log("QUESTION PAPER EXTRACTION DEBUG");
    console.log("--------------------------------");
    console.log("Filename:", req.file?.originalname || "(missing)");
    console.log("MIME type:", req.file?.mimetype || "(missing)");
    console.log("File size:", req.file?.size || 0);
    console.log("File path/buffer available:", Boolean(req.file?.path));
    const ext = path.extname(req.file.originalname).toLowerCase();
    const buffer = await fs.readFile(req.file.path);
    let text = "";
    if (ext === ".pdf") {
      if (buffer.slice(0, 4).toString() !== "%PDF") throw new Error("Uploaded file is not a valid PDF");
      console.log("PDF parser loaded:", typeof PDFParse === "function");
      stage = "text-extraction";
      const parser = new PDFParse({ data: buffer });
      try { text = (await parser.getText())?.text || ""; } finally { await parser.destroy(); }
    } else if (ext === ".docx") {
      stage = "text-extraction";
      text = (await mammoth.extractRawText({ buffer })).value || "";
    }
    else throw new Error("Legacy .doc files cannot be reliably extracted. Please save the document as .docx or PDF.");
    text = text.trim();
    console.log("Extracted text length:", text.length);
    console.log("Extracted text preview:", text.slice(0, 1000));
    stage = "question-parser";
    let extractionMode = "text";
    let questions = meaningfulText(text) ? parseQuestionPaper(text.slice(0, 60000)) : [];
    if (ext === ".pdf" && !questions.length) {
      extractionMode = "ocr";
      stage = "ocr";
      console.log("Scanned or unparseable PDF detected. Starting local OCR.");
      const ocrResult = await extractPdfTextWithOcr(buffer, (progress) => console.log(`OCR page ${progress.page}/${progress.pages}`));
      text = ocrResult.text.trim();
      console.log("OCR extracted text length:", text.length);
      console.log("OCR extracted text preview:", text.slice(0, 1000));
      questions = meaningfulText(text) ? parseQuestionPaper(text.slice(0, 60000)) : [];
    }
    console.log("Detected question count:", questions.length);
    console.log("Parsed questions:", JSON.stringify(questions));
    console.log("--------------------------------");
    if (!questions.length) {
      const message = extractionMode === "ocr"
        ? "Unable to extract readable text from the scanned PDF. Please upload a clearer PDF."
        : "Text was extracted successfully, but no recognizable questions were found.";
      return errorResponse(res, { status: 400, stage: extractionMode === "ocr" ? "ocr" : "question-parser", message });
    }
    return successResponse(res, { message: "Questions extracted locally", data: { text: text.slice(0, 60000), questions, fileName: req.file.originalname, extractionMode } });
  } catch (error) {
    console.error("Question paper extraction failed:", error);
    const message = stage === "ocr" ? "Unable to extract readable text from the scanned PDF. Please upload a clearer PDF." : error.message || "Unable to extract document text";
    return errorResponse(res, { message, status: 400, stage });
  }
};

const getStudents = async (req, res) => {
  const faculty = await Faculty.findById(req.user.id).populate("assignedStudents", "name email department year");
  return successResponse(res, { data: faculty?.assignedStudents || [] });
};

const createAssessment = async (req, res) => {
  try {
    const { title, description = "", duration = 60, passingMarks = 0, questions, studentIds } = req.body || {};
    if (!title || !Array.isArray(questions) || !questions.length) return errorResponse(res, { message: "Title and at least one confirmed question are required", status: 400 });
    const invalidQuestion = questions.find((q) => !q.confirmed || !String(q.question || "").trim() || !Array.isArray(q.options) || q.options.length < 2 || q.options.some((option) => !String(option || "").trim()) || !String(q.correctAnswer || "").trim() || !q.options.includes(q.correctAnswer));
    if (invalidQuestion) return errorResponse(res, { message: "Every confirmed question needs text, at least two non-empty options, and a selected correct answer", status: 400 });
    const faculty = await Faculty.findById(req.user.id).select("assignedStudents");
    const allowed = new Set((faculty?.assignedStudents || []).map(String));
    if (Array.isArray(studentIds) && studentIds.some((id) => !allowed.has(String(id)))) return errorResponse(res, { message: "Assessments can only be assigned to your assigned students", status: 403 });
    const createdQuestions = await QuestionBank.insertMany(questions.map((q) => ({ title, subject: q.subject || "Faculty Material", topic: q.topic || title, difficulty: q.difficulty || "Medium", marks: Math.max(1, Number(q.marks) || 1), question: q.question, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation || "", questionType: "MCQ", createdBy: req.user.id })));
    const totalMarks = createdQuestions.reduce((sum, q) => sum + q.marks, 0);
    const assessment = await Assessment.create({ title, description, duration: Math.max(1, Number(duration) || 60), passingMarks: Math.min(totalMarks, Math.max(0, Number(passingMarks) || 0)), questions: createdQuestions.map((q) => q._id), assignedStudents: studentIds || [], assignedFaculty: req.user.id, totalMarks, status: studentIds?.length ? "Published" : "Draft", assessmentType: "Practice" });
    await Faculty.findByIdAndUpdate(req.user.id, { $addToSet: { assignedAssessments: assessment._id } });
    return successResponse(res, { status: 201, message: "Assessment finalized and assigned", data: assessment });
  } catch (error) { return errorResponse(res, { message: error.message, status: error.name === "ValidationError" ? 400 : 500 }); }
};

const assignAssessment = async (req, res) => {
  try {
    const { studentIds, deadline } = req.body || {};
    if (!Array.isArray(studentIds) || !studentIds.length || !deadline) return errorResponse(res, { message: "Select at least one student and provide a deadline", status: 400 });
    const endDate = new Date(deadline);
    if (Number.isNaN(endDate.getTime()) || endDate <= new Date()) return errorResponse(res, { message: "Deadline must be a valid future date", status: 400 });
    const faculty = await Faculty.findById(req.user.id).select("assignedStudents");
    const allowed = new Set((faculty?.assignedStudents || []).map(String));
    if (!studentIds.every((id) => allowed.has(String(id)))) return errorResponse(res, { message: "Students must belong to your faculty assignment", status: 403 });
    const assessment = await Assessment.findOne({ _id: req.params.id, assignedFaculty: req.user.id, isActive: true });
    if (!assessment) return errorResponse(res, { message: "Assessment not found", status: 404 });
    const current = new Set((assessment.assignedStudents || []).map(String));
    studentIds.forEach((id) => current.add(String(id)));
    assessment.assignedStudents = [...current];
    assessment.endDate = endDate;
    assessment.status = "Published";
    await assessment.save();
    return successResponse(res, { message: "Assessment assigned successfully", data: assessment });
  } catch (error) { return errorResponse(res, { message: error.message, status: 500 }); }
};

const getAssessments = async (req, res) => {
  const assessments = await Assessment.find({ assignedFaculty: req.user.id, isActive: true }).sort({ createdAt: -1 }).lean();
  const results = await AssessmentResult.find({ assessment: { $in: assessments.map((assessment) => assessment._id) } }).select("assessment percentage").lean();
  const resultMap = new Map();
  results.forEach((result) => { const key = result.assessment.toString(); resultMap.set(key, [...(resultMap.get(key) || []), result]); });
  const data = assessments.map((assessment) => {
    const assessmentResults = resultMap.get(assessment._id.toString()) || [];
    const percentages = assessmentResults.map((result) => Number(result.percentage) || 0);
    return { ...assessment, statusLabel: assessment.assignedStudents?.length ? (assessment.endDate && new Date(assessment.endDate) < new Date() ? "EXPIRED" : "ASSIGNED") : "NOT_ASSIGNED", totalQuestions: assessment.questions?.length || 0, assignedCount: assessment.assignedStudents?.length || 0, attendedCount: assessmentResults.length, notAttendedCount: Math.max(0, (assessment.assignedStudents?.length || 0) - assessmentResults.length), averagePercentage: percentages.length ? Number((percentages.reduce((sum, score) => sum + score, 0) / percentages.length).toFixed(2)) : null };
  });
  return successResponse(res, { data });
};

const getAssessmentDetails = async (req, res) => {
  const assessment = await Assessment.findOne({ _id: req.params.id, assignedFaculty: req.user.id, isActive: true }).populate("assignedStudents", "name email department").lean();
  if (!assessment) return errorResponse(res, { status: 404, message: "Assessment not found" });
  const results = await AssessmentResult.find({ assessment: assessment._id }).populate("student", "name email department").select("student score totalMarks percentage submittedAt completed").lean();
  const resultMap = new Map(results.map((result) => [result.student?._id?.toString(), result]));
  const percentages = results.map((result) => Number(result.percentage) || 0);
  return successResponse(res, { data: { assessment: { ...assessment, totalQuestions: assessment.questions?.length || 0, assignedCount: assessment.assignedStudents?.length || 0, attendedCount: results.length, notAttendedCount: Math.max(0, (assessment.assignedStudents?.length || 0) - results.length), averagePercentage: percentages.length ? Number((percentages.reduce((sum, value) => sum + value, 0) / percentages.length).toFixed(2)) : null }, students: (assessment.assignedStudents || []).map((student) => ({ student, result: resultMap.get(student._id.toString()) || null, status: resultMap.has(student._id.toString()) ? "Completed" : "Not Attended" })) } });
};

const updateAssessmentTitle = async (req, res) => {
  const title = String(req.body?.title || "").trim();
  if (!title) return errorResponse(res, { status: 400, message: "Assessment title is required" });
  const assessment = await Assessment.findOne({ _id: req.params.id, assignedFaculty: req.user.id, isActive: true });
  if (!assessment) return errorResponse(res, { status: 404, message: "Assessment not found" });
  assessment.title = title;
  await assessment.save();
  return successResponse(res, { message: "Assessment title updated successfully", data: assessment });
};

const deleteAssessment = async (req, res) => {
  const assessment = await Assessment.findOne({ _id: req.params.id, assignedFaculty: req.user.id, isActive: true });
  if (!assessment) return errorResponse(res, { status: 404, message: "Assessment not found" });
  assessment.isActive = false;
  await assessment.save();
  return successResponse(res, { message: "Assessment deleted successfully", data: assessment });
};

const updateDeadline = async (req, res) => {
  try {
    const endDate = new Date(req.body?.deadline);
    if (Number.isNaN(endDate.getTime()) || endDate <= new Date()) return errorResponse(res, { status: 400, message: "Deadline must be a valid future date" });
    const assessment = await Assessment.findOneAndUpdate({ _id: req.params.id, assignedFaculty: req.user.id, isActive: true }, { endDate, status: "Published" }, { new: true, runValidators: true });
    if (!assessment) return errorResponse(res, { status: 404, message: "Assessment not found" });
    return successResponse(res, { message: "Assessment rescheduled successfully", data: assessment });
  } catch (error) { return errorResponse(res, { status: 400, message: error.message }); }
};

module.exports = { extractMaterial, getStudents, createAssessment, assignAssessment, getAssessments, getAssessmentDetails, updateAssessmentTitle, deleteAssessment, updateDeadline };
