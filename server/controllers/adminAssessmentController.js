const mongoose = require("mongoose");
const Assessment = require("../models/Assessment");
const QuestionBank = require("../models/QuestionBank");
const Student = require("../models/Student");
const AssessmentResult = require("../models/AssessmentResult");
const { successResponse, errorResponse } = require("../utils/response");

const statusFor = (assessment) => {
  if (!assessment.department || !assessment.assignedStudents?.length) return "NOT_ASSIGNED";
  if (assessment.endDate && new Date(assessment.endDate) < new Date()) return "EXPIRED";
  return "ASSIGNED";
};

const summary = (assessment, results = []) => {
  const attended = results.length;
  const scores = results.map((result) => Number(result.percentage) || 0);
  return {
    ...assessment,
    statusLabel: statusFor(assessment),
    totalQuestions: assessment.questions?.length || 0,
    assignedCount: assessment.assignedStudents?.length || 0,
    attendedCount: attended,
    notAttendedCount: Math.max(0, (assessment.assignedStudents?.length || 0) - attended),
    averagePercentage: scores.length ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2)) : null,
    highestPercentage: scores.length ? Math.max(...scores) : null,
    lowestPercentage: scores.length ? Math.min(...scores) : null,
  };
};

const assertAdminOwnedAssessment = async (id) => {
  const assessment = await Assessment.findOne({ _id: id, isActive: true }).select("assignedFaculty");
  if (!assessment) return null;
  if (assessment.assignedFaculty) {
    const error = new Error("Admin cannot modify a Faculty-created assessment");
    error.status = 403;
    throw error;
  }
  return assessment;
};

const createAssessment = async (req, res) => {
  try {
    const { title, description = "", questionIds, duration = 60 } = req.body || {};
    if (!title?.trim() || !Array.isArray(questionIds) || !questionIds.length) return errorResponse(res, { status: 400, message: "Title and imported questions are required" });
    if (!questionIds.every((id) => mongoose.isValidObjectId(id))) return errorResponse(res, { status: 400, message: "Invalid question ID" });
    const questions = await QuestionBank.find({ _id: { $in: questionIds }, isActive: true }).select("_id marks");
    if (questions.length !== questionIds.length) return errorResponse(res, { status: 400, message: "One or more imported questions are unavailable" });
    const totalMarks = questions.reduce((sum, question) => sum + (Number(question.marks) || 1), 0);
    const assessment = await Assessment.create({
      title: title.trim(), description, questions: questionIds, totalMarks,
      duration: Math.max(1, Number(duration) || 60), status: "Draft", isActive: true,
      assessmentType: "Practice", createdByAdmin: req.user.id,
    });
    return successResponse(res, { status: 201, message: "Assessment created successfully. Assign a department to publish it.", data: assessment });
  } catch (error) { return errorResponse(res, { status: error.status || (error.name === "ValidationError" ? 400 : 500), message: error.message }); }
};

const getDepartments = async (req, res) => {
  const departments = await Student.distinct("department", { isActive: true, department: { $nin: [null, ""] } });
  return successResponse(res, { data: departments.sort() });
};

const getAssessments = async (req, res) => {
  const assessments = await Assessment.find({ isInitialAssessment: { $ne: true }, isActive: true }).sort({ createdAt: -1 }).lean();
  const results = await AssessmentResult.find({ assessment: { $in: assessments.map((assessment) => assessment._id) } }).select("assessment percentage score totalMarks student submittedAt").lean();
  const resultMap = new Map();
  results.forEach((result) => { const key = result.assessment.toString(); resultMap.set(key, [...(resultMap.get(key) || []), result]); });
  const data = assessments.map((assessment) => summary(assessment, resultMap.get(assessment._id.toString()) || []));
  return successResponse(res, { data });
};

const assignAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    await assertAdminOwnedAssessment(id);
    const { department, deadline } = req.body || {};
    if (!mongoose.isValidObjectId(id) || !department?.trim() || !deadline) return errorResponse(res, { status: 400, message: "Assessment, department, and deadline are required" });
    const endDate = new Date(deadline);
    if (Number.isNaN(endDate.getTime()) || endDate <= new Date()) return errorResponse(res, { status: 400, message: "Deadline must be a valid future date" });
    const students = await Student.find({ department: department.trim(), isActive: true }).select("_id");
    if (!students.length) return errorResponse(res, { status: 400, message: "No active students found in this department" });
    const assessment = await Assessment.findOneAndUpdate({ _id: id, isInitialAssessment: { $ne: true } }, { department: department.trim(), assignedStudents: students.map((student) => student._id), endDate, status: "Published", isActive: true }, { new: true, runValidators: true });
    if (!assessment) return errorResponse(res, { status: 404, message: "Assessment not found" });
    return successResponse(res, { message: "Assessment assigned successfully", data: assessment });
  } catch (error) { return errorResponse(res, { status: error.status || (error.name === "ValidationError" ? 400 : 500), message: error.message }); }
};

const updateDeadline = async (req, res) => {
  try {
    await assertAdminOwnedAssessment(req.params.id);
    const endDate = new Date(req.body?.deadline);
    if (Number.isNaN(endDate.getTime()) || endDate <= new Date()) return errorResponse(res, { status: 400, message: "Deadline must be a valid future date" });
    const assessment = await Assessment.findOneAndUpdate({ _id: req.params.id, isActive: true }, { endDate, status: "Published" }, { new: true, runValidators: true });
    if (!assessment) return errorResponse(res, { status: 404, message: "Assessment not found" });
    return successResponse(res, { message: "Assessment rescheduled successfully", data: assessment });
  } catch (error) { return errorResponse(res, { status: error.status || 400, message: error.message }); }
};

const enableAssessment = async (req, res) => {
  try {
    await assertAdminOwnedAssessment(req.params.id);
  } catch (error) {
    return errorResponse(res, { status: error.status || 500, message: error.message });
  }
  const endDate = new Date(req.body?.deadline);
  if (Number.isNaN(endDate.getTime()) || endDate <= new Date()) return errorResponse(res, { status: 400, message: "A future deadline is required to enable this assessment" });
  const assessment = await Assessment.findOneAndUpdate({ _id: req.params.id, department: { $ne: "" }, assignedStudents: { $exists: true, $not: { $size: 0 } }, isActive: true }, { status: "Published", endDate }, { new: true });
  if (!assessment) return errorResponse(res, { status: 400, message: "Assessment must be assigned before it can be enabled" });
  return successResponse(res, { message: "Assessment enabled successfully", data: assessment });
};

const getAssessmentDetails = async (req, res) => {
  const assessment = await Assessment.findById(req.params.id)
    .populate("assignedStudents", "name email department")
    .populate("questions", "question options correctAnswer subject topic difficulty explanation")
    .lean();
  if (!assessment) return errorResponse(res, { status: 404, message: "Assessment not found" });
  const results = await AssessmentResult.find({ assessment: assessment._id }).populate("student", "name email department").select("student score totalMarks percentage submittedAt completed").lean();
  const resultMap = new Map(results.map((result) => [result.student?._id?.toString(), result]));
  const students = (assessment.assignedStudents || []).map((student) => ({ student, result: resultMap.get(student._id.toString()) || null, status: resultMap.has(student._id.toString()) ? "Completed" : "Not Attended" }));
  return successResponse(res, { data: { assessment: summary(assessment, results), students, results } });
};

const updateTitle = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return errorResponse(res, { status: 400, message: "Invalid assessment ID" });
    await assertAdminOwnedAssessment(req.params.id);
    const title = String(req.body?.title || "").trim();
    if (!title) return errorResponse(res, { status: 400, message: "Assessment title is required" });
    const assessment = await Assessment.findOne({ _id: req.params.id, isActive: true });
    if (!assessment) return errorResponse(res, { status: 404, message: "Assessment not found" });
    assessment.title = title;
    await assessment.save();
    return successResponse(res, { message: "Assessment title updated successfully", data: assessment });
  } catch (error) { return errorResponse(res, { status: error.status || (error.name === "ValidationError" ? 400 : 500), message: error.message }); }
};

const deleteAssessment = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return errorResponse(res, { status: 400, message: "Invalid assessment ID" });
    await assertAdminOwnedAssessment(req.params.id);
    const assessment = await Assessment.findOne({ _id: req.params.id, isActive: true });
    if (!assessment) return errorResponse(res, { status: 404, message: "Assessment not found" });
    assessment.isActive = false;
    await assessment.save();
    return successResponse(res, { message: "Assessment deleted successfully", data: assessment });
  } catch (error) { return errorResponse(res, { status: error.status || 500, message: error.message }); }
};

module.exports = { createAssessment, getDepartments, getAssessments, assignAssessment, updateDeadline, enableAssessment, getAssessmentDetails, updateTitle, deleteAssessment };
