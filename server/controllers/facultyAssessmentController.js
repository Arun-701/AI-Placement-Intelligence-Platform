const fs = require("fs").promises;
const path = require("path");
const mongoose = require("mongoose");
const mammoth = require("mammoth");
const WordExtractor = require("word-extractor");
const { PDFParse } = require("pdf-parse");
const Assessment = require("../models/Assessment");
const QuestionBank = require("../models/QuestionBank");
const AssessmentResult = require("../models/AssessmentResult");
const { buildAssessmentSummary } = require("../utils/assessmentSummary");
const { buildAssessmentResultRows } = require("../utils/assessmentResultRows");
const { getDepartmentQuery, normalizeDepartment } = require("../utils/department");
const AssessmentAttendanceRequest = require("../models/AssessmentAttendanceRequest");
const Faculty = require("../models/Faculty");
const Student = require("../models/Student");
const { parseQuestionPaper } = require("../services/adapters/questionParser");
const { extractPdfTextWithOcr } = require("../services/questionPaperOcrService");
const { validateForImport } = require("../services/questionUploadService");
const { successResponse, errorResponse } = require("../utils/response");

const meaningfulText = (value) => String(value || "").replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "").replace(/\s+/g, "").trim();
const parseFacultyQuestions = (text) => {
  const result = parseQuestionPaper(text);
  return Array.isArray(result?.questions) ? result.questions : [];
};

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
    } else if (ext === ".doc") {
      stage = "text-extraction";
      text = (await new WordExtractor().extract(buffer)).getBody() || "";
    }
    else throw new Error("Only PDF, DOC, and DOCX files are supported.");
    text = text.trim();
    console.log("Extracted text length:", text.length);
    console.log("Extracted text preview:", text.slice(0, 1000));
    stage = "question-parser";
    let extractionMode = "text";
    let questions = meaningfulText(text) ? parseFacultyQuestions(text.slice(0, 60000)) : [];
    if (ext === ".pdf" && !questions.length) {
      extractionMode = "ocr";
      stage = "ocr";
      console.log("Scanned or unparseable PDF detected. Starting local OCR.");
      const ocrResult = await extractPdfTextWithOcr(buffer, (progress) => console.log(`OCR page ${progress.page}/${progress.pages}`));
      text = ocrResult.text.trim();
      console.log("OCR extracted text length:", text.length);
      console.log("OCR extracted text preview:", text.slice(0, 1000));
      questions = meaningfulText(text) ? parseFacultyQuestions(text.slice(0, 60000)) : [];
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
  const faculty = await Faculty.findById(req.user.id).select("department").lean();
  if (!faculty) return errorResponse(res, { message: "Faculty not found", status: 404 });
  const department = String(faculty.department || "").trim().replace(/\s+/g, " ");
  const students = department
    ? await Student.find({
      department: getDepartmentQuery(department),
      isActive: true,
    })
      .select("name email studentId department year")
      .sort({ name: 1 })
      .lean()
    : [];
  return successResponse(res, { data: { department, students } });
};

const importQuestions = async (req, res) => {
  try {
    const submittedQuestions = req.body?.questions;
    if (!Array.isArray(submittedQuestions) || !submittedQuestions.length) {
      return errorResponse(res, { message: "Questions are required for import.", status: 400 });
    }
    const missingTopics = submittedQuestions.some((question) => {
      const topic = String(question?.topic || "").trim();
      return !topic || /^(?:question paper|general)$/i.test(topic);
    });
    if (missingTopics) {
      return errorResponse(res, { message: "Every question needs a predicted topic before import.", status: 400 });
    }
    const questions = validateForImport(submittedQuestions).filter((question) => question.valid);
    if (!questions.length) return errorResponse(res, { message: "There are no valid questions to import.", status: 400 });
    const created = await QuestionBank.insertMany(questions.map((question) => ({
      title: question.question.slice(0, 120),
      subject: question.subject || "Imported Questions",
      topic: question.topic || "General",
      difficulty: question.difficulty || "Medium",
      marks: Math.max(1, Number(question.marks) || 1),
      question: question.question,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || "",
      questionType: "MCQ",
      createdBy: req.user.id
    })));
    return successResponse(res, {
      status: 201,
      message: `${created.length} questions imported successfully`,
      data: { count: created.length, questionIds: created.map((question) => question._id), questions: created }
    });
  } catch (error) {
    console.error("Faculty question import failed", {
      questionCount: Array.isArray(req.body?.questions) ? req.body.questions.length : null,
      errorName: error.name,
      message: error.message
    });
    return errorResponse(res, { message: error.message || "Unable to import questions", status: error.name === "ValidationError" ? 400 : 500 });
  }
};

const createAssessment = async (req, res) => {
  try {
    const { title, description = "", duration = 60, passingMarks = 0, assessmentType = "Practice", questions, questionIds, questionSets: requestedQuestionSets, studentIds } = req.body || {};
    if (!title?.trim() || (!Array.isArray(questions) && !Array.isArray(questionIds))) return errorResponse(res, { message: "Title and at least one confirmed question are required", status: 400 });
    if (!["Practice", "Internal", "Mock", "Placement", "Initial"].includes(assessmentType)) return errorResponse(res, { message: "Assessment type is invalid", status: 400 });
    const safeDuration = Number(duration);
    if (!Number.isFinite(safeDuration) || safeDuration < 1) return errorResponse(res, { message: "Duration must be at least 1 minute", status: 400 });

    let createdQuestions = [];
    let assessmentQuestionIds = [];
    let questionSets = [];
    if (Array.isArray(questionIds)) {
      if (!questionIds.length || !questionIds.every((id) => mongoose.isValidObjectId(id)) || new Set(questionIds.map(String)).size !== questionIds.length) {
        return errorResponse(res, { message: "Imported question IDs are invalid", status: 400 });
      }
      createdQuestions = await QuestionBank.find({
        _id: { $in: questionIds },
        createdBy: req.user.id,
        isActive: true
      }).select("_id marks");
      if (createdQuestions.length !== questionIds.length) return errorResponse(res, { message: "One or more imported questions are unavailable", status: 400 });
      assessmentQuestionIds = questionIds;

      if (requestedQuestionSets !== undefined && !Array.isArray(requestedQuestionSets)) {
        return errorResponse(res, { message: "Question sets must be an array", status: 400 });
      }
      if (Array.isArray(requestedQuestionSets) && requestedQuestionSets.length) {
        const normalizedSets = [];
        for (let index = 0; index < requestedQuestionSets.length; index += 1) {
          const set = requestedQuestionSets[index];
          if (!set || typeof set !== "object" || !Array.isArray(set.questionIds) || !set.questionIds.length || !set.questionIds.every((id) => mongoose.isValidObjectId(id) && questionIds.includes(String(id)))) {
            return errorResponse(res, { message: `Set ${index + 1} contains invalid questions`, status: 400 });
          }
          const setNumber = Number(set.setNumber);
          if (!Number.isInteger(setNumber) || setNumber < 1) return errorResponse(res, { message: `Set ${index + 1} has an invalid set number`, status: 400 });
          normalizedSets.push({ setNumber, questions: [...new Set(set.questionIds.map(String))] });
        }
        if (new Set(normalizedSets.map((set) => set.setNumber)).size !== normalizedSets.length) {
          return errorResponse(res, { message: "Question set numbers must be unique", status: 400 });
        }
        const assignedQuestionIds = normalizedSets.flatMap((set) => set.questions);
        if (new Set(assignedQuestionIds).size !== assignedQuestionIds.length) {
          return errorResponse(res, { message: "A question cannot belong to more than one set", status: 400 });
        }
        if (assignedQuestionIds.length !== questionIds.length || questionIds.some((id) => !assignedQuestionIds.includes(String(id)))) {
          return errorResponse(res, { message: "Every assessment question must belong to exactly one set", status: 400 });
        }
        questionSets = normalizedSets;
      }
    } else {
      if (!questions.length) return errorResponse(res, { message: "Title and at least one confirmed question are required", status: 400 });
      const invalidQuestion = questions.find((q) => !q.confirmed || !String(q.question || "").trim() || !Array.isArray(q.options) || q.options.length < 2 || q.options.some((option) => !String(option || "").trim()) || !String(q.correctAnswer || "").trim() || !q.options.includes(q.correctAnswer));
      if (invalidQuestion) return errorResponse(res, { message: "Every confirmed question needs text, at least two non-empty options, and a selected correct answer", status: 400 });
    }

    const faculty = await Faculty.findById(req.user.id).select("assignedStudents");
    const allowed = new Set((faculty?.assignedStudents || []).map(String));
    if (Array.isArray(studentIds) && studentIds.some((id) => !allowed.has(String(id)))) return errorResponse(res, { message: "Assessments can only be assigned to your assigned students", status: 403 });
    if (!Array.isArray(questionIds)) {
      createdQuestions = await QuestionBank.insertMany(questions.map((q) => ({ title, subject: q.subject || "Faculty Material", topic: q.topic || title, difficulty: q.difficulty || "Medium", marks: Math.max(1, Number(q.marks) || 1), question: q.question, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation || "", questionType: "MCQ", createdBy: req.user.id })));
      assessmentQuestionIds = createdQuestions.map((q) => q._id);
    }
    const totalMarks = createdQuestions.reduce((sum, q) => sum + q.marks, 0);
    const assessment = await Assessment.create({ title: title.trim(), description, duration: safeDuration, passingMarks: Math.min(totalMarks, Math.max(0, Number(passingMarks) || 0)), questions: assessmentQuestionIds, assignedStudents: studentIds || [], assignedFaculty: req.user.id, totalMarks, status: studentIds?.length ? "Published" : "Draft", assessmentType, questionSets });
    await Faculty.findByIdAndUpdate(req.user.id, { $addToSet: { assignedAssessments: assessment._id } });
    return successResponse(res, { status: 201, message: "Assessment finalized and assigned", data: assessment });
  } catch (error) { return errorResponse(res, { message: error.message, status: error.name === "ValidationError" ? 400 : 500 }); }
};

const assignAssessment = async (req, res) => {
  try {
    const requestedStudentIds = req.body?.studentIds;
    const studentIds = Array.isArray(requestedStudentIds) ? [...new Set(requestedStudentIds.map(String))] : [];
    const deadline = req.body?.deadline;
    if (!mongoose.isValidObjectId(req.params.id) || !studentIds.length || !studentIds.every(mongoose.isValidObjectId) || !deadline) return errorResponse(res, { message: "Select a valid assessment, valid students, and provide a deadline", status: 400 });
    const endDate = new Date(deadline);
    if (Number.isNaN(endDate.getTime()) || endDate <= new Date()) return errorResponse(res, { message: "Deadline must be a valid future date", status: 400 });
    const faculty = await Faculty.findById(req.user.id).select("assignedStudents");
    const allowed = new Set((faculty?.assignedStudents || []).map(String));
    if (!studentIds.every((id) => allowed.has(String(id)))) return errorResponse(res, { message: "Students must belong to your faculty assignment", status: 403 });
    const activeStudents = await Student.find({ _id: { $in: studentIds }, isActive: true }).select("_id").lean();
    if (activeStudents.length !== studentIds.length) return errorResponse(res, { message: "One or more selected students are unavailable", status: 400 });
    const assessment = await Assessment.findOne({ _id: req.params.id, assignedFaculty: req.user.id, isActive: true });
    if (!assessment) return errorResponse(res, { message: "Assessment not found", status: 404 });
    if (assessment.questionSets?.length) {
      return errorResponse(res, { message: "This assessment must be assigned by question set", status: 409 });
    }
    const current = new Set((assessment.assignedStudents || []).map(String));
    if (studentIds.some((id) => current.has(id))) return errorResponse(res, { message: "One or more selected students are already assigned to this assessment", status: 409 });
    studentIds.forEach((id) => current.add(String(id)));
    assessment.assignedStudents = [...current];
    assessment.endDate = endDate;
    assessment.status = "Published";
    await assessment.save();
    return successResponse(res, { message: "Assessment assigned successfully", data: assessment });
  } catch (error) { return errorResponse(res, { message: error.message, status: error.name === "ValidationError" ? 400 : 500 }); }
};

const assignAssessmentSets = async (req, res) => {
  try {
    const { id: assessmentId } = req.params;
    const submittedSets = req.body?.sets;
    if (!mongoose.isValidObjectId(assessmentId) || !Array.isArray(submittedSets) || !submittedSets.length) {
      return errorResponse(res, { message: "Assessment and at least one question set are required", status: 400 });
    }

    const normalizedSets = [];
    const selectedIndexes = new Set();
    for (const submittedSet of submittedSets) {
      const setIndex = Number(submittedSet?.setIndex);
      const departments = Array.isArray(submittedSet?.departments)
        ? [...new Set(submittedSet.departments.map((department) => String(department).trim()).filter(Boolean))]
        : [];
      const studentIds = Array.isArray(submittedSet?.studentIds)
        ? [...new Set(submittedSet.studentIds.map(String))]
        : [];
      const startDate = new Date(submittedSet?.startDate);
      const endDate = new Date(submittedSet?.endDate);
      if (!Number.isInteger(setIndex) || setIndex < 0 || selectedIndexes.has(setIndex)) {
        return errorResponse(res, { message: "Each question set must have a unique valid set index", status: 400 });
      }
      if (departments.length !== 1) {
        return errorResponse(res, { message: `Set ${setIndex + 1}: Select one authorized department`, status: 400 });
      }
      if (!studentIds.length || !studentIds.every(mongoose.isValidObjectId)) {
        return errorResponse(res, { message: `Set ${setIndex + 1}: Select at least one valid student`, status: 400 });
      }
      if (!submittedSet?.startDate || !submittedSet?.endDate) {
        return errorResponse(res, { message: `Set ${setIndex + 1}: Start and end dates are required`, status: 400 });
      }
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return errorResponse(res, { message: `Set ${setIndex + 1}: Invalid date format`, status: 400 });
      }
      if (endDate <= startDate) {
        return errorResponse(res, { message: `Set ${setIndex + 1}: End date must be after start date`, status: 400 });
      }
      if (startDate <= new Date()) {
        return errorResponse(res, { message: `Set ${setIndex + 1}: Start date must be in the future`, status: 400 });
      }
      selectedIndexes.add(setIndex);
      normalizedSets.push({ setIndex, department: departments[0], studentIds, startDate, endDate });
    }

    const [faculty, assessment] = await Promise.all([
      Faculty.findById(req.user.id).select("department"),
      Assessment.findOne({ _id: assessmentId, assignedFaculty: req.user.id, isActive: true }),
    ]);
    if (!assessment) return errorResponse(res, { message: "Assessment not found", status: 404 });
    if (!faculty) return errorResponse(res, { message: "Faculty not found", status: 404 });
    const authorizedDepartment = String(faculty.department || "").trim().replace(/\s+/g, " ");
    const normalizedAuthorizedDepartment = normalizeDepartment(authorizedDepartment);
    if (!authorizedDepartment) {
      return errorResponse(res, { message: "No department is assigned to your faculty account", status: 403 });
    }
    if (normalizedSets.some(({ department }) => normalizeDepartment(department) !== normalizedAuthorizedDepartment)) {
      return errorResponse(res, { message: "You can only assign students from your assigned department", status: 403 });
    }
    const questionSets = assessment.questionSets || [];
    if (!questionSets.length) return errorResponse(res, { message: "This assessment has no question sets to assign", status: 400 });
    if (normalizedSets.some(({ setIndex }) => setIndex >= questionSets.length)) {
      return errorResponse(res, { message: "One or more question set selections are invalid", status: 400 });
    }
    if (normalizedSets.some(({ setIndex }) => {
      const questions = questionSets[setIndex]?.questions || [];
      return !questions.length;
    })) {
      return errorResponse(res, { message: "A selected question set has no questions", status: 400 });
    }

    const activeAssignments = (assessment.setAssignments || []).filter((assignment) =>
      assignment.assignedStudents?.length || assignment.departments?.length
    );
    const assignedSetIndexes = new Set(activeAssignments.map((assignment) => Number(assignment.setIndex)));
    if (normalizedSets.some(({ setIndex }) => assignedSetIndexes.has(setIndex))) {
      return errorResponse(res, { message: "One or more selected question sets are already assigned", status: 409 });
    }
    if (!activeAssignments.length && assessment.assignedStudents?.length) {
      return errorResponse(res, { message: "This assessment already has a legacy assignment and cannot be assigned by question set", status: 409 });
    }
    const existingSetStudentIds = new Set(activeAssignments.flatMap((assignment) =>
      (assignment.assignedStudents || []).map((studentId) => String(studentId?._id || studentId))
    ));
    if ((assessment.assignedStudents || []).some((studentId) =>
      !existingSetStudentIds.has(String(studentId?._id || studentId))
    )) {
      return errorResponse(res, { message: "This assessment has students assigned outside its question sets", status: 409 });
    }

    const requestedStudentIds = [...new Set(normalizedSets.flatMap(({ studentIds }) => studentIds))];
    const students = await Student.find({
      _id: { $in: requestedStudentIds },
      department: getDepartmentQuery(authorizedDepartment),
      isActive: true,
    })
      .select("_id department")
      .lean();
    if (students.length !== requestedStudentIds.length) {
      return errorResponse(res, { message: "One or more selected students are unavailable or outside your assigned department", status: 400 });
    }
    const studentsById = new Map(students.map((student) => [String(student._id), student]));
    const newAssignments = [];
    for (const set of normalizedSets) {
      const setStudents = set.studentIds.map((studentId) => studentsById.get(studentId));
      newAssignments.push({
        setIndex: set.setIndex,
        departments: [set.department],
        startDate: set.startDate,
        endDate: set.endDate,
        assignedStudents: setStudents.map((student) => student._id),
      });
      questionSets[set.setIndex].departments = [set.department];
      questionSets[set.setIndex].startDate = set.startDate;
      questionSets[set.setIndex].endDate = set.endDate;
    }

    const allAssignments = [...activeAssignments, ...newAssignments];
    const assignmentStartDates = allAssignments.map((assignment) => new Date(assignment.startDate).getTime()).filter(Number.isFinite);
    const assignmentEndDates = allAssignments.map((assignment) => new Date(assignment.endDate).getTime()).filter(Number.isFinite);
    assessment.setAssignments = allAssignments;
    assessment.assignedStudents = [...new Set(allAssignments.flatMap((assignment) =>
      (assignment.assignedStudents || []).map((studentId) => String(studentId?._id || studentId))
    ))];
    assessment.department = [...new Set(allAssignments.flatMap((assignment) => assignment.departments || []))].join(", ");
    if (assignmentStartDates.length) assessment.startDate = new Date(Math.min(...assignmentStartDates));
    if (assignmentEndDates.length) assessment.endDate = new Date(Math.max(...assignmentEndDates));
    assessment.status = "Published";
    assessment.usesMultiSetAssignment = true;
    await assessment.save();

    return successResponse(res, {
      message: "Assessment assigned successfully",
      data: assessment,
    });
  } catch (error) {
    return errorResponse(res, {
      status: error.code === 11000 ? 409 : error.name === "ValidationError" ? 400 : 500,
      message: error.message,
    });
  }
};

const getAssessments = async (req, res) => {
  const assessments = await Assessment.find({ assignedFaculty: req.user.id, isActive: true }).sort({ createdAt: -1 }).lean();
  const results = await AssessmentResult.find({
    assessment: { $in: assessments.map((assessment) => assessment._id) },
    completed: true,
  })
    .select("assessment student percentage submittedAt createdAt completed")
    .sort({ submittedAt: -1, createdAt: -1 })
    .lean();
  const resultMap = new Map();
  results.forEach((result) => { const key = result.assessment.toString(); resultMap.set(key, [...(resultMap.get(key) || []), result]); });
  const data = assessments.map((assessment) => {
    const assessmentResults = resultMap.get(assessment._id.toString()) || [];
    return buildAssessmentSummary(assessment, assessmentResults);
  });
  return successResponse(res, { data });
};

const getAssessmentDetails = async (req, res) => {
  const assessment = await Assessment.findOne({ _id: req.params.id, assignedFaculty: req.user.id, isActive: true })
    .populate("assignedStudents", "name email department")
    .populate("setAssignments.assignedStudents", "name email department")
    .populate("questions", "question options correctAnswer subject topic difficulty explanation")
    .lean();
  if (!assessment) return errorResponse(res, { status: 404, message: "Assessment not found" });
  const [results, requests] = await Promise.all([
    AssessmentResult.find({ assessment: assessment._id })
      .populate("student", "name email department")
      .select("student score totalMarks percentage answers.question submittedAt completed questionSetIndex attemptNumber reattemptAssignment createdAt")
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean(),
    AssessmentAttendanceRequest.find({
      assessment: assessment._id,
      active: { $ne: false },
      status: { $in: ["Requested", "Assigned", "Cancelled"] },
    }).select("student setIndex status createdAt updatedAt").lean(),
  ]);
  const students = buildAssessmentResultRows(assessment, results, requests);
  const assessmentSummary = buildAssessmentSummary(assessment, results);
  return successResponse(res, { data: { assessment: assessmentSummary, students, results } });
};

const updateAssessmentTitle = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return errorResponse(res, { status: 400, message: "Invalid assessment ID" });
    const title = String(req.body?.title || "").trim();
    if (!title) return errorResponse(res, { status: 400, message: "Assessment title is required" });
    const assessment = await Assessment.findOne({ _id: req.params.id, assignedFaculty: req.user.id, isActive: true });
    if (!assessment) return errorResponse(res, { status: 404, message: "Assessment not found" });

    if (Array.isArray(req.body?.sets)) {
      const questionSets = assessment.questionSets || [];
      const assignments = assessment.setAssignments || [];
      const activeAssignments = assignments.filter((assignment) =>
        assignment.assignedStudents?.length || assignment.departments?.length
      );
      const legacySingleSetAssignment = questionSets.length === 1
        && !activeAssignments.some((assignment) => Number(assignment.setIndex) === 0)
        && assessment.assignedStudents?.length;
      const assignedSetIndexes = activeAssignments.map((assignment) => Number(assignment.setIndex));
      if (legacySingleSetAssignment) assignedSetIndexes.push(0);
      if (req.body.sets.length !== assignedSetIndexes.length) {
        return errorResponse(res, { status: 400, message: "All assigned question sets must be included" });
      }

      const seenIndexes = new Set();
      for (const config of req.body.sets) {
        const setIndex = Number(config?.setIndex);
        const startDate = new Date(config?.startDate);
        const endDate = new Date(config?.endDate);
        if (!Number.isInteger(setIndex) || setIndex < 0 || setIndex >= questionSets.length || !assignedSetIndexes.includes(setIndex) || seenIndexes.has(setIndex)) {
          return errorResponse(res, { status: 400, message: "Each assigned question set must be included exactly once" });
        }
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
          return errorResponse(res, { status: 400, message: `Set ${setIndex + 1}: Choose valid start and end dates with the end after the start` });
        }
        seenIndexes.add(setIndex);
        const assignment = activeAssignments.find((entry) => Number(entry.setIndex) === setIndex);
        if (assignment) {
          assignment.startDate = startDate;
          assignment.endDate = endDate;
        } else if (legacySingleSetAssignment && setIndex === 0) {
          assessment.startDate = startDate;
          assessment.endDate = endDate;
        }
        questionSets[setIndex].startDate = startDate;
        questionSets[setIndex].endDate = endDate;
      }

      const dateAssignments = legacySingleSetAssignment
        ? [{ startDate: assessment.startDate, endDate: assessment.endDate }]
        : activeAssignments;
      const startTimes = dateAssignments.map((assignment) => new Date(assignment.startDate).getTime()).filter(Number.isFinite);
      const endTimes = dateAssignments.map((assignment) => new Date(assignment.endDate).getTime()).filter(Number.isFinite);
      if (startTimes.length) assessment.startDate = new Date(Math.min(...startTimes));
      if (endTimes.length) assessment.endDate = new Date(Math.max(...endTimes));
    }

    assessment.title = title;
    await assessment.save();
    return successResponse(res, { message: "Assessment title updated successfully", data: assessment });
  } catch (error) {
    return errorResponse(res, { status: error.name === "ValidationError" ? 400 : 500, message: error.message });
  }
};

const deleteAssessment = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return errorResponse(res, { status: 400, message: "Invalid assessment ID" });
    const assessment = await Assessment.findOne({ _id: req.params.id, assignedFaculty: req.user.id, isActive: true });
    if (!assessment) return errorResponse(res, { status: 404, message: "Assessment not found" });
    assessment.isActive = false;
    await assessment.save();
    return successResponse(res, { message: "Assessment deleted successfully", data: assessment });
  } catch (error) {
    return errorResponse(res, { status: error.name === "ValidationError" ? 400 : 500, message: error.message });
  }
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

module.exports = { extractMaterial, getStudents, parseFacultyQuestions, importQuestions, createAssessment, assignAssessment, assignAssessmentSets, getAssessments, getAssessmentDetails, updateAssessmentTitle, deleteAssessment, updateDeadline };
