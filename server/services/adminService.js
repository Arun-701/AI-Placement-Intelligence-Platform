const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const Assessment = require("../models/Assessment");
const AssessmentResult = require("../models/AssessmentResult");
const Roadmap = require("../models/Roadmap");

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
  return Student.find().select("-password").lean();
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

  const existingStudents = await Student.find({ _id: { $in: validStudentIds } }).select("_id");
  if (existingStudents.length === 0) {
    throw new Error("No matching students found for assignment");
  }

  const assignedSet = new Set((faculty.assignedStudents || []).map((id) => id.toString()));
  existingStudents.forEach((student) => assignedSet.add(student._id.toString()));

  faculty.assignedStudents = Array.from(assignedSet);
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
    totalCompletedAssessments
  ] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ isActive: true }),
    Faculty.countDocuments(),
    Faculty.countDocuments({ isActive: true }),
    Assessment.countDocuments(),
    Roadmap.countDocuments(),
    AssessmentResult.countDocuments({ completed: true })
  ]);

  const averageReadinessResult = await Student.aggregate([
    { $group: { _id: null, averageReadiness: { $avg: "$placementReadinessScore" } } }
  ]);

  const departmentSummary = await Student.aggregate([
    {
      $group: {
        _id: "$department",
        count: { $sum: 1 },
        averageReadiness: { $avg: "$placementReadinessScore" },
        averageCgpa: { $avg: "$cgpa" }
      }
    },
    { $project: { department: "$_id", count: 1, averageReadiness: { $round: ["$averageReadiness", 2] }, averageCgpa: { $round: ["$averageCgpa", 2] }, _id: 0 } },
    { $sort: { count: -1 } }
  ]);

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

  const readinessDistribution = await Student.aggregate([
    {
      $project: {
        readinessLevel: {
          $switch: {
            branches: [
              { case: { $gte: ["$placementReadinessScore", 80] }, then: "High" },
              { case: { $gte: ["$placementReadinessScore", 60] }, then: "Medium" }
            ],
            default: "Low"
          }
        }
      }
    },
    { $group: { _id: "$readinessLevel", count: { $sum: 1 } } }
  ]);

  const readinessStats = readinessDistribution.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  return {
    studentOverview: {
      totalStudents,
      activeStudents,
      inactiveStudents: totalStudents - activeStudents,
      averagePlacementReadiness: round(averageReadinessResult[0]?.averageReadiness || 0),
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
    placementReadinessDistribution: {
      High: readinessStats.High || 0,
      Medium: readinessStats.Medium || 0,
      Low: readinessStats.Low || 0
    }
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
    .select("name email department year placementReadinessScore profileCompleted isActive createdAt")
    .lean();

  const sortedStudents = students
    .map((student) => ({
      ...student,
      placementReadinessScore: student.placementReadinessScore || 0
    }))
    .sort((a, b) => b.placementReadinessScore - a.placementReadinessScore);

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
