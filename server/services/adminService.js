const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const Assessment = require("../models/Assessment");
const AssessmentResult = require("../models/AssessmentResult");
const AssessmentAttendanceRequest = require("../models/AssessmentAttendanceRequest");
const Roadmap = require("../models/Roadmap");
const { normalizeDepartment } = require("../utils/department");
const { attachPlacementReadinessScores } = require("./readinessService");

const round = (value, precision = 2) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Number(numberValue.toFixed(precision)) : 0;
};

const sanitizeModel = (doc) => {
  if (!doc) return null;
  const object = doc.toObject ? doc.toObject() : doc;
  delete object.password;
  return object;
};

const getAdminProfile = async (adminId) => {
  const admin = await Admin.findById(adminId).select("-password").lean();
  if (!admin) {
    throw new Error("Admin not found");
  }
  return admin;
};

const listStudents = async () => {
  const students = await Student.find().select("-password").lean();
  return attachPlacementReadinessScores(students);
};

const getStudentById = async (studentId) => {
  if (!mongoose.isValidObjectId(studentId)) {
    throw new Error("Invalid student ID");
  }
  const student = await Student.findById(studentId).select("-password").lean();
  if (!student) {
    throw new Error("Student not found");
  }
  return student;
};

const createStudent = async (payload) => {
  const existingStudent = await Student.findOne({ email: payload.email });
  if (existingStudent) {
    throw new Error("Student with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const student = await Student.create({
    name: payload.name,
    email: payload.email,
    password: hashedPassword,
    department: payload.department,
    year: payload.year,
    section: payload.section || "",
    cgpa: payload.cgpa !== undefined ? payload.cgpa : 0,
    studentId: payload.studentId || undefined,
    skills: Array.isArray(payload.skills) ? payload.skills : [],
    isActive: payload.isActive !== undefined ? payload.isActive : true,
    isVerified: payload.isVerified !== undefined ? payload.isVerified : true,
    passwordChangedAt: new Date()
  });

  return sanitizeModel(student);
};

const updateStudent = async (studentId, payload) => {
  if (!mongoose.isValidObjectId(studentId)) {
    throw new Error("Invalid student ID");
  }

  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error("Student not found");
  }

  if (payload.email && payload.email !== student.email) {
    const existingStudent = await Student.findOne({ email: payload.email });
    if (existingStudent && existingStudent._id.toString() !== studentId) {
      throw new Error("Email is already in use by another student");
    }
  }

  if (payload.password) {
    student.password = await bcrypt.hash(payload.password, 10);
    student.passwordChangedAt = new Date();
  }

  Object.entries(payload).forEach(([key, value]) => {
    if (key === "password") return;
    if (Object.prototype.hasOwnProperty.call(student, key)) {
      student[key] = value;
    }
  });

  await student.save();
  return sanitizeModel(student);
};

const deleteStudent = async (studentId) => {
  if (!mongoose.isValidObjectId(studentId)) {
    throw new Error("Invalid student ID");
  }

  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error("Student not found");
  }

  await Faculty.updateMany(
    { assignedStudents: student._id },
    { $pull: { assignedStudents: student._id } }
  );

  await student.deleteOne();
  return { success: true };
};

const listFaculties = async () => {
  return Faculty.find().select("-password").lean();
};

const getFacultyById = async (facultyId) => {
  if (!mongoose.isValidObjectId(facultyId)) {
    throw new Error("Invalid faculty ID");
  }
  const faculty = await Faculty.findById(facultyId).select("-password").lean();
  if (!faculty) {
    throw new Error("Faculty not found");
  }
  return faculty;
};

const createFaculty = async (payload) => {
  const existingFaculty = await Faculty.findOne({ email: payload.email });
  if (existingFaculty) {
    throw new Error("Faculty with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const faculty = await Faculty.create({
    name: payload.name,
    email: payload.email,
    password: hashedPassword,
    department: payload.department || "",
    designation: payload.designation || "",
    facultyId: payload.facultyId || undefined,
    isActive: payload.isActive !== undefined ? payload.isActive : true,
    isVerified: payload.isVerified !== undefined ? payload.isVerified : true,
    approvalStatus: payload.approvalStatus || "APPROVED",
    role: "faculty",
    passwordChangedAt: new Date()
  });

  return sanitizeModel(faculty);
};

const updateFaculty = async (facultyId, payload) => {
  if (!mongoose.isValidObjectId(facultyId)) {
    throw new Error("Invalid faculty ID");
  }

  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    throw new Error("Faculty not found");
  }

  if (payload.email && payload.email !== faculty.email) {
    const existingFaculty = await Faculty.findOne({ email: payload.email });
    if (existingFaculty && existingFaculty._id.toString() !== facultyId) {
      throw new Error("Email is already in use by another faculty");
    }
  }

  if (payload.password) {
    faculty.password = await bcrypt.hash(payload.password, 10);
    faculty.passwordChangedAt = new Date();
  }

  Object.entries(payload).forEach(([key, value]) => {
    if (key === "password") return;
    if (Object.prototype.hasOwnProperty.call(faculty, key)) {
      faculty[key] = value;
    }
  });

  await faculty.save();
  return sanitizeModel(faculty);
};

const deleteFaculty = async (facultyId) => {
  if (!mongoose.isValidObjectId(facultyId)) {
    throw new Error("Invalid faculty ID");
  }

  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    throw new Error("Faculty not found");
  }

  await Assessment.updateMany(
    { assignedFaculty: faculty._id },
    { $unset: { assignedFaculty: "" } }
  );

  await faculty.deleteOne();
  return { success: true };
};

const assignStudentsToFaculty = async (facultyId, studentIds) => {
  if (!mongoose.isValidObjectId(facultyId)) {
    throw new Error("Invalid faculty ID");
  }

  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    throw new Error("Faculty not found");
  }

  const validStudentIds = studentIds.filter((id) => mongoose.isValidObjectId(id));
  if (validStudentIds.length === 0) {
    throw new Error("No valid student IDs were provided");
  }

  const existingStudents = await Student.find({ _id: { $in: validStudentIds } }).select("_id department");
  if (existingStudents.length === 0) {
    const error = new Error("No matching students found for assignment");
    error.status = 400;
    throw error;
  }
  if (existingStudents.length !== validStudentIds.length) {
    const error = new Error("One or more selected students were not found");
    error.status = 400;
    throw error;
  }

  const departmentsByNormalizedName = new Map();
  existingStudents.forEach((student) => {
    const department = String(student.department || "").trim().replace(/\s+/g, " ");
    const normalizedDepartment = normalizeDepartment(department);
    if (normalizedDepartment) {
      const existing = departmentsByNormalizedName.get(normalizedDepartment);
      if (existing) {
        existing.count += 1;
      } else {
        departmentsByNormalizedName.set(normalizedDepartment, { department, count: 1 });
      }
    }
  });
  const departments = [...departmentsByNormalizedName.values()]
    .sort((left, right) => right.count - left.count)
    .map(({ department }) => department);
  if (departments.length !== 1) {
    const error = new Error("Students must all belong to the same department");
    error.status = 400;
    throw error;
  }

  const assignedSet = new Set((faculty.assignedStudents || []).map((id) => id.toString()));
  existingStudents.forEach((student) => assignedSet.add(student._id.toString()));

  faculty.assignedStudents = Array.from(assignedSet);
  faculty.department = departments[0];
  await faculty.save();

  return sanitizeModel(faculty);
};

const removeStudentsFromFaculty = async (facultyId, studentIds) => {
  if (!mongoose.isValidObjectId(facultyId)) {
    throw new Error("Invalid faculty ID");
  }

  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    throw new Error("Faculty not found");
  }

  const validStudentIds = studentIds.filter((id) => mongoose.isValidObjectId(id));
  if (validStudentIds.length === 0) {
    throw new Error("No valid student IDs were provided");
  }

  faculty.assignedStudents = (faculty.assignedStudents || []).filter(
    (id) => !validStudentIds.includes(id.toString())
  );
  await faculty.save();

  return sanitizeModel(faculty);
};

const buildAdminDashboard = async () => {
  const [
    totalStudents,
    activeStudents,
    totalFaculties,
    activeFaculties,
    totalAssessments,
    totalRoadmaps,
    totalCompletedAssessments,
    studentRequestCount
  ] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ isActive: true }),
    Faculty.countDocuments(),
    Faculty.countDocuments({ isActive: true }),
    Assessment.countDocuments(),
    Roadmap.countDocuments(),
    AssessmentResult.countDocuments({ completed: true }),
    AssessmentAttendanceRequest.countDocuments({ active: { $ne: false }, status: "Requested" })
  ]);

  const scoredStudents = await attachPlacementReadinessScores(await Student.find()
    .select("department cgpa skills resume resumeAnalysis codingProfile readinessProfile")
    .lean());
  const departmentGroups = new Map();
  const readinessStats = { High: 0, Medium: 0, Low: 0 };
  let totalReadiness = 0;
  scoredStudents.forEach((student) => {
    const level = student.readinessProfile.level;
    readinessStats[level] += 1;
    totalReadiness += student.placementReadinessScore;

    const department = student.department || "";
    const group = departmentGroups.get(department) || {
      department,
      count: 0,
      totalReadiness: 0,
      totalCgpa: 0,
      cgpaCount: 0
    };
    group.count += 1;
    group.totalReadiness += student.placementReadinessScore;
    if (Number.isFinite(Number(student.cgpa)) && student.cgpa !== null && student.cgpa !== undefined) {
      group.totalCgpa += Number(student.cgpa);
      group.cgpaCount += 1;
    }
    departmentGroups.set(department, group);
  });
  const departmentSummary = Array.from(departmentGroups.values())
    .map((group) => ({
      department: group.department,
      count: group.count,
      averageReadiness: round(group.totalReadiness / group.count),
      averageCgpa: group.cgpaCount ? round(group.totalCgpa / group.cgpaCount) : null
    }))
    .sort((left, right) => right.count - left.count);

  const roadmapMetrics = await Roadmap.aggregate([
    {
      $group: {
        _id: null,
        averageCompletion: { $avg: "$progress.completionPercentage" },
        completedRoadmaps: { $sum: { $cond: [{ $gte: ["$progress.completionPercentage", 75] }, 1, 0] } }
      }
    }
  ]);

  const assessmentStatusCounts = await Assessment.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  return {
    studentRequestCount,
    studentOverview: {
      totalStudents,
      activeStudents,
      inactiveStudents: totalStudents - activeStudents,
      averagePlacementReadiness: scoredStudents.length ? round(totalReadiness / scoredStudents.length) : 0,
      departments: departmentSummary
    },
    facultyOverview: {
      totalFaculties,
      activeFaculties,
      inactiveFaculties: totalFaculties - activeFaculties
    },
    assessmentOverview: {
      totalAssessments,
      completedAssessments: totalCompletedAssessments,
      statusCounts: assessmentStatusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    },
    roadmapOverview: {
      totalRoadmaps,
      averageCompletion: round(roadmapMetrics[0]?.averageCompletion || 0),
      completedRoadmaps: roadmapMetrics[0]?.completedRoadmaps || 0
    },
    placementReadinessDistribution: readinessStats
  };
};

const buildAdminStatistics = async () => {
  const [dashboard] = await Promise.all([buildAdminDashboard()]);
  return {
    ...dashboard,
    timestamp: new Date()
  };
};

const buildAdminStudentReport = async () => {
  const students = await Student.find()
    .select("name email department year cgpa skills resume resumeAnalysis codingProfile readinessProfile placementReadinessScore assessmentsCompleted profileCompleted isActive createdAt")
    .lean();
  const resultStats = await AssessmentResult.aggregate([
    { $match: { completed: true } },
    { $group: { _id: "$student", assessmentCount: { $sum: 1 }, averageAssessmentScore: { $avg: "$percentage" } } }
  ]);
  const statsByStudent = new Map(resultStats.map((item) => [item._id.toString(), item]));
  const studentsWithReadiness = await attachPlacementReadinessScores(students);

  const sortedStudents = studentsWithReadiness
    .map((student) => {
      const stats = statsByStudent.get(student._id.toString());
      return {
        ...student,
        problemsSolved: student.codingProfile?.totalProblemsSolved || 0,
        assessmentCount: stats?.assessmentCount || student.assessmentsCompleted || 0,
        averageAssessmentScore: round(stats?.averageAssessmentScore || 0),
        placementReadinessScore: student.placementReadinessScore
      };
    })
    .sort((a, b) => (b.placementReadinessScore - a.placementReadinessScore) || (b.averageAssessmentScore - a.averageAssessmentScore) || (b.problemsSolved - a.problemsSolved));

  return {
    totalStudents: students.length,
    topStudents: sortedStudents.slice(0, 10),
    students: sortedStudents
  };
};

const buildAdminFacultyReport = async () => {
  const faculties = await Faculty.find()
    .select("name email department designation assignedStudents isActive createdAt")
    .lean();

  return {
    totalFaculties: faculties.length,
    faculties: faculties.map((faculty) => ({
      ...faculty,
      assignedStudentCount: Array.isArray(faculty.assignedStudents) ? faculty.assignedStudents.length : 0
    }))
  };
};

const buildAdminAssessmentReport = async () => {
  const assessmentStatusCounts = await Assessment.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  const typeCounts = await Assessment.aggregate([
    { $group: { _id: "$assessmentType", count: { $sum: 1 } } }
  ]);

  const completedResults = await AssessmentResult.countDocuments({ completed: true });
  const allResults = await AssessmentResult.countDocuments();

  return {
    totalAssessments: await Assessment.countDocuments(),
    completedAssessmentResults: completedResults,
    totalAssessmentResults: allResults,
    statusCounts: assessmentStatusCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    typeCounts: typeCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };
};

module.exports = {
  getAdminProfile,
  listStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  listFaculties,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  assignStudentsToFaculty,
  removeStudentsFromFaculty,
  buildAdminDashboard,
  buildAdminStatistics,
  buildAdminStudentReport,
  buildAdminFacultyReport,
  buildAdminAssessmentReport
};
