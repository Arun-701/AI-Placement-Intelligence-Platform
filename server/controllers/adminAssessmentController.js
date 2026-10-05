const mongoose = require("mongoose");
const Assessment = require("../models/Assessment");
const QuestionBank = require("../models/QuestionBank");
const Student = require("../models/Student");
const AssessmentResult = require("../models/AssessmentResult");
const AssessmentAttendanceRequest = require("../models/AssessmentAttendanceRequest");
const ReattemptAssignment = require("../models/ReattemptAssignment");
const { createNotification, markAdminStudentRequestNotificationsHandled } = require("../services/notificationService");
const { getReattemptSetAvailability } = require("../utils/reattemptSetAvailability");
const { getAssessmentSetMetrics } = require("../utils/assessmentSetMetrics");
const { successResponse, errorResponse } = require("../utils/response");

const summary = (assessment, results = [], now = new Date()) => {
  const latestResults = new Map();
  results.forEach((result) => {
    const studentId = String(result.student?._id || result.student);
    const previous = latestResults.get(studentId);
    if (!previous || new Date(result.submittedAt || result.createdAt) > new Date(previous.submittedAt || previous.createdAt)) {
      latestResults.set(studentId, result);
    }
  });
  const attended = latestResults.size;
  const scores = [...latestResults.values()].map((result) => Number(result.percentage) || 0);
  const setMetrics = getAssessmentSetMetrics(assessment, now);
  return {
    ...assessment,
    statusLabel: setMetrics.statusLabel,
    setMetrics,
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
  const now = new Date();
  const data = assessments.map((assessment) => summary(assessment, resultMap.get(assessment._id.toString()) || [], now));
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

const getAssessmentDetails = async (req, res) => {
  const assessment = await Assessment.findById(req.params.id)
    .populate("assignedStudents", "name email department")
    .populate("questions", "question options correctAnswer subject topic difficulty explanation")
    .lean();
  if (!assessment) return errorResponse(res, { status: 404, message: "Assessment not found" });
  const results = await AssessmentResult.find({ assessment: assessment._id })
    .populate("student", "name email department")
    .select("student score totalMarks percentage submittedAt completed questionSetIndex attemptNumber createdAt")
    .sort({ submittedAt: -1, createdAt: -1 })
    .lean();
  const requests = await AssessmentAttendanceRequest.find({
    assessment: assessment._id,
    active: { $ne: false },
    status: { $in: ["Requested", "Assigned", "Cancelled"] },
  }).select("student setIndex status").lean();
  const resultsByStudent = new Map();
  results.forEach((result) => {
    const studentId = result.student?._id?.toString();
    if (!studentId) return;
    resultsByStudent.set(studentId, [...(resultsByStudent.get(studentId) || []), result]);
  });
  const requestMap = new Map(requests.map((request) => [request.student.toString(), request]));
  const setIndexByStudent = new Map();
  (assessment.setAssignments || []).forEach((assignment) => {
    (assignment.assignedStudents || []).forEach((studentId) => setIndexByStudent.set(studentId.toString(), Number(assignment.setIndex)));
  });
  const students = (assessment.assignedStudents || []).map((student) => {
    const studentId = student._id.toString();
    const assignedSetIndex = setIndexByStudent.get(studentId);
    const matchingResults = (resultsByStudent.get(studentId) || []).filter((candidate) =>
      assignedSetIndex === undefined ||
      candidate.questionSetIndex === null ||
      candidate.questionSetIndex === undefined ||
      Number(candidate.questionSetIndex) === assignedSetIndex
    );
    const result = matchingResults[0] || null;
    const candidateRequest = requestMap.get(studentId);
    const request = candidateRequest && (
      assignedSetIndex === undefined || Number(candidateRequest.setIndex) === assignedSetIndex
    ) ? candidateRequest : null;
    return {
      student,
      result,
      status: result ? "Completed" : request ? request.status : "Not Attended",
      requestStatus: request?.status || null,
      requestId: request?._id || null,
      setIndex: assignedSetIndex ?? request?.setIndex ?? 0,
    };
  });
  return successResponse(res, { data: { assessment: summary(assessment, results), students, results } });
};

const getReattemptOptions = async (req, res) => {
  try {
    const { id: assessmentId } = req.params;
    const studentIds = Array.isArray(req.body?.studentIds)
      ? [...new Set(req.body.studentIds.map(String))]
      : [];
    if (!mongoose.isValidObjectId(assessmentId) || !studentIds.length || !studentIds.every(mongoose.isValidObjectId)) {
      return errorResponse(res, { status: 400, message: "Assessment and valid student IDs are required" });
    }

    const assessment = await Assessment.findOne({ _id: assessmentId, isActive: true })
      .populate("questions", "question options correctAnswer subject topic difficulty marks")
      .lean();
    if (!assessment) return errorResponse(res, { status: 404, message: "Assessment not found" });
    if (assessment.assignedFaculty) return errorResponse(res, { status: 403, message: "Admin cannot modify a Faculty-created assessment" });

    const requests = await AssessmentAttendanceRequest.find({
      assessment: assessmentId,
      student: { $in: studentIds },
      active: { $ne: false },
      status: "Requested",
    }).lean();
    if (requests.length !== studentIds.length) {
      return errorResponse(res, { status: 409, message: "One or more selected students no longer have an active attendance request" });
    }
    const completedResult = await AssessmentResult.exists({ assessment: assessmentId, student: { $in: studentIds } });
    if (completedResult) return errorResponse(res, { status: 409, message: "Only students who have not attended this assessment can be assigned a re-attempt" });

    const students = await Student.find({ _id: { $in: studentIds }, isActive: true }).select("_id name department").lean();
    if (students.length !== studentIds.length) {
      return errorResponse(res, { status: 400, message: "One or more selected students are unavailable" });
    }

    const requestsBelongToOriginalAssignments = requests.every((request) => {
      if (request.originalAssignmentType === "set-assignment") {
        return (assessment.setAssignments || []).some((assignment) =>
          String(assignment._id) === String(request.originalAssignment) &&
          Number(assignment.setIndex) === Number(request.setIndex) &&
          (assignment.assignedStudents || []).some((studentId) => String(studentId) === String(request.student))
        );
      }
      return String(assessment._id) === String(request.originalAssignment)
        && (assessment.assignedStudents || []).some((studentId) => String(studentId) === String(request.student));
    });
    if (!requestsBelongToOriginalAssignments) {
      return errorResponse(res, { status: 409, message: "One or more original assignments have changed" });
    }

    const previousReattemptAssignments = await ReattemptAssignment.find({
      assessment: assessmentId,
      students: { $in: studentIds },
    }).select("students setIndex").lean();
    const availability = getReattemptSetAvailability({
      assessment,
      studentIds,
      previousReattemptAssignments,
      originalAssignments: requests.map((request) => ({ student: request.student, setIndex: request.setIndex })),
    });

    return successResponse(res, {
      data: {
        assessment: { ...assessment, questionSets: availability.questionSets },
        students,
        setIndexes: availability.setIndexes,
        availableSetIndexes: availability.availableSetIndexes,
        assignedSetIndexes: availability.assignedSetIndexes,
        studentSetAssignments: availability.studentSetAssignments,
      },
    });
  } catch (error) {
    return errorResponse(res, { status: error.status || 500, message: error.message });
  }
};

const assignReattempt = async (req, res) => {
  try {
    const { id: assessmentId } = req.params;
    const { studentIds: requestedStudentIds, setIndex: requestedSetIndex, departments: requestedDepartments, startDate: requestedStartDate, endDate: requestedEndDate } = req.body || {};
    const studentIds = Array.isArray(requestedStudentIds) ? [...new Set(requestedStudentIds.map(String))] : [];
    const setIndex = Number(requestedSetIndex);
    const startDate = new Date(requestedStartDate);
    const endDate = new Date(requestedEndDate);
    const departments = Array.isArray(requestedDepartments)
      ? [...new Set(requestedDepartments.map((department) => String(department).trim()).filter(Boolean))]
      : [];

    if (!mongoose.isValidObjectId(assessmentId) || !studentIds.length || !studentIds.every(mongoose.isValidObjectId)) {
      return errorResponse(res, { status: 400, message: "Assessment and valid student IDs are required" });
    }
    if (!Number.isInteger(setIndex) || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate || startDate <= new Date()) {
      return errorResponse(res, { status: 400, message: "Select a valid question set and future start/end dates" });
    }
    if (!departments.length) return errorResponse(res, { status: 400, message: "Select at least one department" });

    const assessment = await Assessment.findOne({ _id: assessmentId, isActive: true });
    if (!assessment) return errorResponse(res, { status: 404, message: "Assessment not found" });
    if (assessment.assignedFaculty) return errorResponse(res, { status: 403, message: "Admin cannot modify a Faculty-created assessment" });

    const requests = await AssessmentAttendanceRequest.find({
      assessment: assessmentId,
      student: { $in: studentIds },
      active: { $ne: false },
      status: "Requested",
    });
    if (requests.length !== studentIds.length) {
      return errorResponse(res, { status: 409, message: "One or more selected students no longer have an active attendance request" });
    }
    const completedResult = await AssessmentResult.exists({ assessment: assessmentId, student: { $in: studentIds } });
    if (completedResult) return errorResponse(res, { status: 409, message: "Only students who have not attended this assessment can be assigned a re-attempt" });

    const allRequestsMatchOriginalAssignments = requests.every((request) => {
      if (request.originalAssignmentType === "set-assignment") {
        return (assessment.setAssignments || []).some((assignment) =>
          String(assignment._id) === String(request.originalAssignment) &&
          Number(assignment.setIndex) === Number(request.setIndex) &&
          (assignment.assignedStudents || []).some((studentId) => String(studentId) === String(request.student))
        );
      }
      return String(assessment._id) === String(request.originalAssignment)
        && (assessment.assignedStudents || []).some((studentId) => String(studentId) === String(request.student));
    });
    if (!allRequestsMatchOriginalAssignments) {
      return errorResponse(res, { status: 409, message: "One or more original assignments have changed" });
    }
    let questionSets = assessment.questionSets || [];
    if (!questionSets.length && (assessment.questions || []).length) {
      questionSets = [{ setNumber: 1, title: "Set 1", questions: assessment.questions }];
    }
    if (setIndex < 0 || setIndex >= questionSets.length) {
      return errorResponse(res, { status: 400, message: "The selected question set does not belong to this assessment" });
    }
    const selectedSet = questionSets[setIndex];
    const selectedQuestionIds = selectedSet.questions?.length ? selectedSet.questions : selectedSet.questionIds || [];
    if (!selectedQuestionIds.length) {
      return errorResponse(res, { status: 400, message: "The selected question set has no questions" });
    }
    const [previousReattemptAssignments, students] = await Promise.all([
      ReattemptAssignment.find({ assessment: assessmentId, students: { $in: studentIds } }).select("students setIndex").lean(),
      Student.find({ _id: { $in: studentIds }, isActive: true }).select("_id department").lean(),
    ]);
    if (students.length !== studentIds.length) return errorResponse(res, { status: 400, message: "One or more selected students are unavailable" });
    const alreadyAssigned = studentIds.some((studentId) => {
      const normalAssignmentExists = (assessment.setAssignments || []).some((assignment) =>
        Number(assignment.setIndex) === setIndex &&
        (assignment.assignedStudents || []).some((assignedStudentId) => String(assignedStudentId) === studentId)
      ) || (
        !assessment.usesMultiSetAssignment &&
        !(assessment.setAssignments || []).length &&
        setIndex === 0 &&
        (assessment.assignedStudents || []).some((assignedStudentId) => String(assignedStudentId) === studentId)
      ) || requests.some((request) =>
        String(request.student) === studentId && Number(request.setIndex) === setIndex
      );
      const reattemptAlreadyExists = previousReattemptAssignments.some((assignment) =>
        Number(assignment.setIndex) === setIndex &&
        (assignment.students || []).some((assignedStudentId) => String(assignedStudentId) === studentId)
      );
      return normalAssignmentExists || reattemptAlreadyExists;
    });
    if (alreadyAssigned) {
      return errorResponse(res, { status: 409, message: "The selected question set has already been assigned to one or more selected students" });
    }
    const questionSet = assessment.questionSets?.[setIndex];
    const questionIds = questionSet?.questions?.length
      ? questionSet.questions
      : questionSet?.questionIds?.length
        ? questionSet.questionIds
      : !(assessment.questionSets || []).length && setIndex === 0
        ? assessment.questions
        : [];
    if (!questionIds?.length) return errorResponse(res, { status: 400, message: "No remaining question set is available for this assessment" });

    const studentDepartments = new Set(students.map((student) => student.department).filter(Boolean));
    if (departments.some((department) => !studentDepartments.has(department))) {
      return errorResponse(res, { status: 400, message: "Departments must belong to the selected students" });
    }

    const existingAssignment = await ReattemptAssignment.exists({
      assessment: assessmentId,
      students: { $in: studentIds },
      active: true,
    });
    if (existingAssignment) return errorResponse(res, { status: 409, message: "A re-attempt is already assigned to one or more selected students" });

    const assignment = await ReattemptAssignment.create({
      assessment: assessmentId,
      students: studentIds,
      requests: requests.map((request) => request._id),
      setIndex,
      departments,
      startDate,
      endDate,
    });
    await AssessmentAttendanceRequest.updateMany(
      { _id: { $in: requests.map((request) => request._id) }, active: { $ne: false }, status: "Requested" },
      { $set: { status: "Assigned" } }
    );
    await markAdminStudentRequestNotificationsHandled(requests.map((request) => request._id));

    return successResponse(res, {
      status: 201,
      message: "Re-attempt questions assigned successfully",
      data: assignment,
    });
  } catch (error) {
    return errorResponse(res, { status: error.status || (error.code === 11000 ? 409 : 500), message: error.message });
  }
};

const cancelAttendanceRequests = async (req, res) => {
  try {
    const { id: assessmentId } = req.params;
    const studentIds = Array.isArray(req.body?.studentIds)
      ? [...new Set(req.body.studentIds.map(String))]
      : [];
    if (!mongoose.isValidObjectId(assessmentId) || !studentIds.length || !studentIds.every(mongoose.isValidObjectId)) {
      return errorResponse(res, { status: 400, message: "Assessment and valid student IDs are required" });
    }

    const assessmentQuery = { _id: assessmentId, isActive: true };
    if (req.user.role === "faculty") assessmentQuery.assignedFaculty = req.user.id;
    const assessment = await Assessment.findOne(assessmentQuery).select("_id title assignedFaculty");
    if (!assessment) return errorResponse(res, { status: 404, message: "Assessment not found or you do not have access to it" });

    const requests = await AssessmentAttendanceRequest.find({
      assessment: assessmentId,
      student: { $in: studentIds },
      active: { $ne: false },
      status: "Requested",
    }).populate("student", "_id name");
    if (requests.length !== studentIds.length) {
      return errorResponse(res, { status: 409, message: "One or more selected students no longer have a pending request" });
    }

    const updateResult = await AssessmentAttendanceRequest.updateMany(
      { _id: { $in: requests.map((request) => request._id) }, active: { $ne: false }, status: "Requested" },
      { $set: { status: "Cancelled", cancelledAt: new Date() } }
    );
    if (updateResult.modifiedCount !== requests.length) {
      return errorResponse(res, { status: 409, message: "One or more requests changed before they could be cancelled" });
    }

    await markAdminStudentRequestNotificationsHandled(requests.map((request) => request._id));
    try {
      await Promise.all(requests.map((request) => createNotification({
        recipient: request.student._id,
        recipientType: "student",
        title: "Retest Request Cancelled",
        message: `Your retest request for ${assessment.title} was cancelled by the administrator.`,
        type: "System Notification",
        priority: "Medium",
        referenceId: assessment._id,
        referenceModel: "Assessment",
      })));
    } catch (notificationError) {
      console.error("Cancelled retest request notification creation failed:", notificationError.message);
      return errorResponse(res, { status: 500, message: "Requests were cancelled, but student notification delivery failed" });
    }

    return successResponse(res, {
      message: "Retest request(s) cancelled successfully",
      data: requests.map((request) => ({ requestId: request._id, studentId: request.student._id })),
    });
  } catch (error) {
    console.error("Retest request cancellation failed:", error);
    return errorResponse(res, { status: error.status || 500, message: error.message || "Unable to cancel retest request" });
  }
};

const updateTitle = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return errorResponse(res, { status: 400, message: "Invalid assessment ID" });
    await assertAdminOwnedAssessment(req.params.id);
    const title = String(req.body?.title || "").trim();
    if (!title) return errorResponse(res, { status: 400, message: "Assessment title is required" });
    const assessment = await Assessment.findOne({ _id: req.params.id, isActive: true });
    if (!assessment) return errorResponse(res, { status: 404, message: "Assessment not found" });

    if (Array.isArray(req.body?.sets)) {
      const setConfigs = req.body.sets;
      const questionSets = assessment.questionSets || [];
      if (setConfigs.length !== questionSets.length) return errorResponse(res, { status: 400, message: "All existing question sets must be included" });

      const configuredSetIndexes = new Set();
      const assignedStudentSet = new Map();
      const assignmentsToUpdate = [];
      const legacySingleSetAssignment = questionSets.length === 1
        && !(assessment.setAssignments || []).some((entry) => Number(entry.setIndex) === 0)
        && assessment.department
        && assessment.assignedStudents?.length;

      for (const config of setConfigs) {
        const setIndex = Number(config?.setIndex);
        if (!Number.isInteger(setIndex) || setIndex < 0 || setIndex >= questionSets.length || configuredSetIndexes.has(setIndex)) {
          return errorResponse(res, { status: 400, message: "Each existing question set must be included exactly once" });
        }
        configuredSetIndexes.add(setIndex);

        const departments = Array.isArray(config.departments)
          ? [...new Set(config.departments.map((department) => String(department).trim()).filter(Boolean))]
          : [];
        const startDate = config.startDate ? new Date(config.startDate) : null;
        const endDate = config.endDate ? new Date(config.endDate) : null;
        if (startDate && Number.isNaN(startDate.getTime())) return errorResponse(res, { status: 400, message: `Set ${setIndex + 1}: Invalid start date` });
        if (endDate && Number.isNaN(endDate.getTime())) return errorResponse(res, { status: 400, message: `Set ${setIndex + 1}: Invalid end date` });
        if (Boolean(startDate) !== Boolean(endDate)) return errorResponse(res, { status: 400, message: `Set ${setIndex + 1}: Start and end dates must both be provided` });
        if (startDate && endDate && endDate <= startDate) return errorResponse(res, { status: 400, message: `Set ${setIndex + 1}: End date must be after start date` });

        const assignment = (assessment.setAssignments || []).find((entry) => Number(entry.setIndex) === setIndex);
        const isLegacySet = Boolean(legacySingleSetAssignment && setIndex === 0 && !assignment);
        const isAssigned = Boolean(isLegacySet || (assignment && (assignment.assignedStudents?.length || assignment.departments?.length)));
        let students = [];

        if (isAssigned) {
          if (!departments.length || !startDate || !endDate) {
            return errorResponse(res, { status: 400, message: `Set ${setIndex + 1}: Assigned sets require departments, start date, and end date` });
          }
          students = await Student.find({ department: { $in: departments }, isActive: true }).select("_id");
          if (!students.length) return errorResponse(res, { status: 400, message: `Set ${setIndex + 1}: No active students found in the selected departments` });
          for (const student of students) {
            const studentId = student._id.toString();
            if (assignedStudentSet.has(studentId) && assignedStudentSet.get(studentId) !== setIndex) {
              return errorResponse(res, { status: 400, message: "A student cannot be assigned to multiple question sets. Choose departments that do not overlap between sets." });
            }
            assignedStudentSet.set(studentId, setIndex);
          }
          assignmentsToUpdate.push({ setIndex, assignment, isLegacySet, departments, startDate, endDate, students });
        } else if (assignment) {
          assignmentsToUpdate.push({ setIndex, assignment, isLegacySet, departments, startDate, endDate, students });
        }

        const questionSet = questionSets[setIndex];
        questionSet.departments = departments;
        questionSet.startDate = startDate || undefined;
        questionSet.endDate = endDate || undefined;
      }

      assessment.title = title;
      for (const update of assignmentsToUpdate) {
        if (update.isLegacySet) {
          assessment.department = update.departments.join(", ");
          assessment.startDate = update.startDate;
          assessment.endDate = update.endDate;
          assessment.assignedStudents = update.students.map((student) => student._id);
        } else {
          update.assignment.departments = update.departments;
          update.assignment.startDate = update.startDate || undefined;
          update.assignment.endDate = update.endDate || undefined;
          update.assignment.assignedStudents = update.students.map((student) => student._id);
        }
      }

      if (!legacySingleSetAssignment) {
        const activeAssignments = (assessment.setAssignments || []).filter((entry) => entry.assignedStudents?.length || entry.departments?.length);
        if (activeAssignments.length) {
          const assignmentStartDates = activeAssignments.map((entry) => new Date(entry.startDate).getTime()).filter(Number.isFinite);
          const assignmentEndDates = activeAssignments.map((entry) => new Date(entry.endDate).getTime()).filter(Number.isFinite);
          assessment.assignedStudents = [...new Set(activeAssignments.flatMap((entry) => (entry.assignedStudents || []).map((studentId) => String(studentId?._id || studentId))))];
          assessment.department = [...new Set(activeAssignments.flatMap((entry) => entry.departments || []))].join(", ");
          if (assignmentStartDates.length) assessment.startDate = new Date(Math.min(...assignmentStartDates));
          if (assignmentEndDates.length) assessment.endDate = new Date(Math.max(...assignmentEndDates));
        }
      }

      await assessment.save();
      return successResponse(res, { message: "Assessment updated successfully", data: assessment });
    }

    if (req.body?.setIndex !== undefined) {
      const setIndex = Number(req.body.setIndex);
      if (!Number.isInteger(setIndex) || setIndex < 0 || setIndex >= assessment.questionSets.length) {
        return errorResponse(res, { status: 400, message: "Invalid question set selection" });
      }

      const departments = Array.isArray(req.body.departments)
        ? [...new Set(req.body.departments.map((department) => String(department).trim()).filter(Boolean))]
        : [];
      const startDate = req.body.startDate ? new Date(req.body.startDate) : null;
      const endDate = req.body.endDate ? new Date(req.body.endDate) : null;
      if (startDate && Number.isNaN(startDate.getTime())) return errorResponse(res, { status: 400, message: "Invalid start date" });
      if (endDate && Number.isNaN(endDate.getTime())) return errorResponse(res, { status: 400, message: "Invalid end date" });
      if (Boolean(startDate) !== Boolean(endDate)) return errorResponse(res, { status: 400, message: "Start and end dates must both be provided" });
      if (startDate && endDate && endDate <= startDate) return errorResponse(res, { status: 400, message: "End date must be after start date" });

      const assignment = (assessment.setAssignments || []).find((entry) => Number(entry.setIndex) === setIndex);
      const isLegacySingleSetAssignment = !assignment && setIndex === 0 && assessment.questionSets.length === 1 && assessment.department && assessment.assignedStudents?.length;
      const isAssigned = Boolean((assignment && (assignment.assignedStudents?.length || assignment.departments?.length)) || isLegacySingleSetAssignment);
      if (isAssigned) {
        if (!departments.length || !startDate || !endDate) {
          return errorResponse(res, { status: 400, message: "Assigned sets require departments, start date, and end date" });
        }
        const students = await Student.find({ department: { $in: departments }, isActive: true }).select("_id");
        if (!students.length) return errorResponse(res, { status: 400, message: "No active students found in the selected departments" });
        const studentIds = new Set(students.map((student) => student._id.toString()));
        const conflicts = (assessment.setAssignments || []).some((entry) =>
          Number(entry.setIndex) !== setIndex && (entry.assignedStudents || []).some((studentId) => studentIds.has(String(studentId?._id || studentId)))
        );
        if (conflicts) return errorResponse(res, { status: 400, message: "A student cannot be assigned to multiple question sets. Choose departments that do not overlap between sets." });

        if (assignment) {
          assignment.departments = departments;
          assignment.startDate = startDate;
          assignment.endDate = endDate;
          assignment.assignedStudents = students.map((student) => student._id);
        } else {
          assessment.department = departments.join(", ");
          assessment.startDate = startDate;
          assessment.endDate = endDate;
          assessment.assignedStudents = students.map((student) => student._id);
        }
      }

      const questionSet = assessment.questionSets[setIndex];
      questionSet.title = title;
      questionSet.departments = departments;
      questionSet.startDate = startDate || undefined;
      questionSet.endDate = endDate || undefined;

      if (isAssigned && assignment) {
        const assignedSets = (assessment.setAssignments || []).filter((entry) => entry.assignedStudents?.length || entry.departments?.length);
        assessment.assignedStudents = [...new Set(assignedSets.flatMap((entry) => (entry.assignedStudents || []).map((studentId) => String(studentId?._id || studentId))))];
        assessment.department = [...new Set(assignedSets.flatMap((entry) => entry.departments || []))].join(", ");
        assessment.startDate = new Date(Math.min(...assignedSets.map((entry) => new Date(entry.startDate).getTime())));
        assessment.endDate = new Date(Math.max(...assignedSets.map((entry) => new Date(entry.endDate).getTime())));
      }

      await assessment.save();
      return successResponse(res, { message: "Question set updated successfully", data: assessment });
    }

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

    const existingSetAssignments = (assessment.setAssignments || []).filter((assignment) =>
      assignment.assignedStudents?.length || assignment.departments?.length
    );
    const assignedSetIndexes = new Set(existingSetAssignments.map((assignment) => Number(assignment.setIndex)));
    if (sets.some((set) => assignedSetIndexes.has(Number(set.setIndex)))) {
      return errorResponse(res, { status: 409, message: "One or more selected question sets are already assigned" });
    }

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
      assessment.questionSets[Number(set.setIndex)].departments = set.departments;
      assessment.questionSets[Number(set.setIndex)].startDate = new Date(set.startDate);
      assessment.questionSets[Number(set.setIndex)].endDate = new Date(set.endDate);
    }

    const allSetAssignments = [...existingSetAssignments, ...setAssignments];
    const studentSetIndex = new Map();
    for (const assignment of allSetAssignments) {
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

    const allDepartments = [...new Set(allSetAssignments.flatMap((assignment) => assignment.departments))];

    // Update assessment
    const updatedAssessment = await Assessment.findByIdAndUpdate(
      assessmentId,
      {
        assignedStudents: [...new Set(allSetAssignments.flatMap((assignment) => assignment.assignedStudents.map((id) => id.toString())))],
        startDate: new Date(Math.min(...allSetAssignments.map((assignment) => new Date(assignment.startDate).getTime()))),
        endDate: new Date(Math.max(...allSetAssignments.map((assignment) => new Date(assignment.endDate).getTime()))),
        department: allDepartments.join(", "),
        status: "Published",
        usesMultiSetAssignment: true,
        setAssignments: allSetAssignments,
      },
      { new: true }
    );

    const persisted = await Assessment.findById(assessmentId).lean();

    return successResponse(res, {
      message: "Assessment assigned successfully",
      data: persisted || updatedAssessment,
    });
  } catch (error) {
    return errorResponse(res, {
      status: error.status || 500,
      message: error.message,
    });
  }
};

module.exports = {
  createAssessment,
  getDepartments,
  getAssessments,
  assignAssessment,
  getAssessmentDetails,
  getReattemptOptions,
  assignReattempt,
  cancelAttendanceRequests,
  updateTitle,
  deleteAssessment,
  assignMultipleSets,
};
