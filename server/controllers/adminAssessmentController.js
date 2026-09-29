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
    const { title, description = "", questionIds, questionSets: requestedQuestionSets, duration = 60 } = req.body || {};
    if (!title?.trim() || !Array.isArray(questionIds) || !questionIds.length) return errorResponse(res, { status: 400, message: "Title and imported questions are required" });
    if (!questionIds.every((id) => mongoose.isValidObjectId(id))) return errorResponse(res, { status: 400, message: "Invalid question ID" });
    const questions = await QuestionBank.find({ _id: { $in: questionIds }, isActive: true }).select("_id marks");
    if (questions.length !== questionIds.length) return errorResponse(res, { status: 400, message: "One or more imported questions are unavailable" });
    let questionSets = [];
    if (requestedQuestionSets !== undefined) {
      if (!Array.isArray(requestedQuestionSets)) return errorResponse(res, { status: 400, message: "Question sets must be an array" });
    }
    if (Array.isArray(requestedQuestionSets) && requestedQuestionSets.length) {
      const normalizedSets = [];
      for (let index = 0; index < requestedQuestionSets.length; index += 1) {
        const set = requestedQuestionSets[index];
        if (!set || typeof set !== "object" || !Array.isArray(set.questionIds) || !set.questionIds.length || !set.questionIds.every((id) => mongoose.isValidObjectId(id) && questionIds.includes(id))) {
          return errorResponse(res, { status: 400, message: `Set ${index + 1} contains invalid questions` });
        }
        const setNumber = Number(set.setNumber);
        if (!Number.isInteger(setNumber) || setNumber < 1) return errorResponse(res, { status: 400, message: `Set ${index + 1} has an invalid set number` });
        normalizedSets.push({ setNumber, questions: [...new Set(set.questionIds)] });
      }
      if (new Set(normalizedSets.map((set) => set.setNumber)).size !== normalizedSets.length) {
        return errorResponse(res, { status: 400, message: "Question set numbers must be unique" });
      }
      const assignedQuestionIds = normalizedSets.flatMap((set) => set.questions.map((id) => id.toString()));
      if (new Set(assignedQuestionIds).size !== assignedQuestionIds.length) {
        return errorResponse(res, { status: 400, message: "A question cannot belong to more than one set" });
      }
      if (assignedQuestionIds.length !== questionIds.length || questionIds.some((id) => !assignedQuestionIds.includes(id.toString()))) {
        return errorResponse(res, { status: 400, message: "Every assessment question must belong to exactly one set" });
      }
      questionSets = normalizedSets;
    }
    const totalMarks = questions.reduce((sum, question) => sum + (Number(question.marks) || 1), 0);
    const assessment = await Assessment.create({
      title: title.trim(), description, questions: questionIds, totalMarks,
      duration: Math.max(1, Number(duration) || 60), status: "Draft", isActive: true,
      assessmentType: "Practice", createdByAdmin: req.user.id, questionSets,
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

// Multi-set assignment: assigns each set to multiple departments with their own dates
const assignMultipleSets = async (req, res) => {
  try {
    const { id: assessmentId } = req.params;
    const { sets } = req.body || {};

    if (!mongoose.isValidObjectId(assessmentId)) {
      return errorResponse(res, { status: 400, message: "Invalid assessment ID" });
    }

    // Validate input
    if (!Array.isArray(sets) || !sets.length) {
      return errorResponse(res, { status: 400, message: "At least one set configuration is required" });
    }

    // Validate each set
    const normalizedSetIndexes = new Set();
    for (const set of sets) {
      if (!set || typeof set !== "object") return errorResponse(res, { status: 400, message: "Each set configuration must be an object" });
      const setIndex = Number(set.setIndex);
      if (!Number.isInteger(setIndex) || setIndex < 0 || normalizedSetIndexes.has(setIndex)) {
        return errorResponse(res, { status: 400, message: "Each configured set must have a unique valid set index" });
      }
      normalizedSetIndexes.add(setIndex);
      if (!Array.isArray(set.departments) || !set.departments.length) {
        return errorResponse(res, { status: 400, message: `Set ${Number(set.setIndex) + 1}: Please select at least one department` });
      }
      if (!set.startDate) {
        return errorResponse(res, { status: 400, message: `Set ${Number(set.setIndex) + 1}: Start date is required` });
      }
      if (!set.endDate) {
        return errorResponse(res, { status: 400, message: `Set ${Number(set.setIndex) + 1}: End date is required` });
      }

      const startDate = new Date(set.startDate);
      const endDate = new Date(set.endDate);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return errorResponse(res, { status: 400, message: `Set ${set.setIndex + 1}: Invalid date format` });
      }
      if (endDate <= startDate) {
        return errorResponse(res, { status: 400, message: `Set ${set.setIndex + 1}: End date must be after start date` });
      }
      set.departments = [...new Set(set.departments.map((department) => String(department).trim()).filter(Boolean))];
      if (!set.departments.length) return errorResponse(res, { status: 400, message: `Set ${set.setIndex + 1}: Please select at least one department` });

      if (startDate <= new Date()) return errorResponse(res, { status: 400, message: `Set ${set.setIndex + 1}: Start date must be in the future` });
    }

    // Get assessment
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return errorResponse(res, { status: 404, message: "Assessment not found" });
    }

    // Check ownership
    if (assessment.assignedFaculty) {
      return errorResponse(res, { status: 403, message: "Cannot modify faculty-created assessments" });
    }

    const questionSets = assessment.questionSets;
    if (!Array.isArray(questionSets) || !questionSets.length) {
      return errorResponse(res, { status: 400, message: "This assessment has no question sets to assign" });
    }

    const validSetIndexes = new Set(questionSets.map((set, index) => index));
    if (sets.some((set) => !Number.isInteger(Number(set.setIndex)) || !validSetIndexes.has(Number(set.setIndex)))) {
      return errorResponse(res, { status: 400, message: "One or more question set selections are invalid" });
    }

    // Collect all unique students from all departments in all sets
    const allDepartments = [...new Set(sets.flatMap((s) => s.departments))];
    // Create set-wise assignment data
    const setAssignments = [];
    for (const set of sets) {
      const setStudents = await Student.find({
        department: { $in: set.departments },
        isActive: true,
      }).select("_id");

      if (!setStudents.length) {
        return errorResponse(res, { status: 400, message: `Set ${Number(set.setIndex) + 1}: No active students found in the selected departments` });
      }

      setAssignments.push({
        setIndex: Number(set.setIndex),
        departments: set.departments,
        startDate: new Date(set.startDate),
        endDate: new Date(set.endDate),
        assignedStudents: setStudents.map((s) => s._id),
      });
    }

    const studentSetIndex = new Map();
    for (const assignment of setAssignments) {
      for (const studentId of assignment.assignedStudents) {
        const key = studentId.toString();
        if (studentSetIndex.has(key) && studentSetIndex.get(key) !== assignment.setIndex) {
          return errorResponse(res, {
            status: 400,
            message: "A student cannot be assigned to multiple question sets. Choose departments that do not overlap between sets.",
          });
        }
        studentSetIndex.set(key, assignment.setIndex);
      }
    }

    // Update assessment
    const updatedAssessment = await Assessment.findByIdAndUpdate(
      assessmentId,
      {
        assignedStudents: [...new Set(setAssignments.flatMap((assignment) => assignment.assignedStudents.map((id) => id.toString())))],
        startDate: new Date(Math.min(...setAssignments.map((assignment) => assignment.startDate.getTime()))),
        endDate: new Date(Math.max(...setAssignments.map((assignment) => assignment.endDate.getTime()))),
        department: allDepartments.join(", "),
        status: "Published",
        usesMultiSetAssignment: true,
        setAssignments: setAssignments, // Store set-wise assignments
      },
      { new: true }
    );

    const persisted = await Assessment.findById(assessmentId).lean();

    return successResponse(res, {
      message: "Assessment assigned successfully to all sets",
      data: persisted || updatedAssessment,
    });
  } catch (error) {
    return errorResponse(res, {
      status: error.status || 500,
      message: error.message,
    });
  }
};

module.exports = { createAssessment, getDepartments, getAssessments, assignAssessment, updateDeadline, enableAssessment, getAssessmentDetails, updateTitle, deleteAssessment, assignMultipleSets };
