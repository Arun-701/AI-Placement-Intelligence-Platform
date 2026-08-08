const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { successResponse, errorResponse } = require("../utils/response");
const Admin = require("../models/Admin");
const {
  validateAdminRegistration,
  validateAdminLogin,
  validateStudentPayload,
  validateFacultyPayload,
  validateAssignmentPayload
} = require("../validators/adminValidator");
const {
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
} = require("../services/adminService");

const createToken = (id) => {
  return jwt.sign({ id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const registerAdmin = async (req, res) => {
  try {
    const { errors, data } = validateAdminRegistration(req.body);
    if (errors.length > 0) {
      return errorResponse(res, { message: errors[0], status: 400 });
    }

    const existingAdmin = await Admin.findOne({ email: data.email });
    if (existingAdmin) {
      return errorResponse(res, { message: "Admin with this email already exists", status: 400 });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const admin = await Admin.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: "admin",
      isActive: true,
      passwordChangedAt: new Date()
    });

    const token = createToken(admin._id);
    const adminData = { _id: admin._id, name: admin.name, email: admin.email, role: admin.role };

    return successResponse(res, {
      status: 201,
      message: "Admin registered successfully",
      data: { token, admin: adminData }
    });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { errors, data } = validateAdminLogin(req.body);
    if (errors.length > 0) {
      return errorResponse(res, { message: errors[0], status: 400 });
    }

    const admin = await Admin.findOne({ email: data.email });
    if (!admin) {
      return errorResponse(res, { message: "Invalid Email or Password", status: 400 });
    }

    if (!admin.isActive) {
      return errorResponse(res, { message: "Account is deactivated", status: 403 });
    }

    const isMatch = await bcrypt.compare(data.password, admin.password);
    if (!isMatch) {
      return errorResponse(res, { message: "Invalid Email or Password", status: 400 });
    }

    const token = createToken(admin._id);
    const sanitizedAdmin = { _id: admin._id, name: admin.name, email: admin.email, role: admin.role };

    return successResponse(res, { message: "Admin login successful", data: { token, admin: sanitizedAdmin } });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const getProfile = async (req, res) => {
  try {
    const admin = await getAdminProfile(req.user.id);
    return successResponse(res, { message: "Admin profile fetched successfully", data: admin });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const getStudents = async (req, res) => {
  try {
    const students = await listStudents();
    return successResponse(res, { message: "Students fetched successfully", data: students });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const getStudent = async (req, res) => {
  try {
    const student = await getStudentById(req.params.id);
    return successResponse(res, { message: "Student fetched successfully", data: student });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const createNewStudent = async (req, res) => {
  try {
    const { errors, data } = validateStudentPayload(req.body, false);
    if (errors.length > 0) {
      return errorResponse(res, { message: errors.join(", "), status: 400 });
    }

    const student = await createStudent(data);
    return successResponse(res, { status: 201, message: "Student created successfully", data: student });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const updateExistingStudent = async (req, res) => {
  try {
    const { errors, data } = validateStudentPayload(req.body, true);
    if (errors.length > 0) {
      return errorResponse(res, { message: errors.join(", "), status: 400 });
    }

    const student = await updateStudent(req.params.id, data);
    return successResponse(res, { message: "Student updated successfully", data: student });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const removeStudent = async (req, res) => {
  try {
    await deleteStudent(req.params.id);
    return successResponse(res, { message: "Student deleted successfully" });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const getFaculties = async (req, res) => {
  try {
    const faculties = await listFaculties();
    return successResponse(res, { message: "Faculties fetched successfully", data: faculties });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const getFaculty = async (req, res) => {
  try {
    const faculty = await getFacultyById(req.params.id);
    return successResponse(res, { message: "Faculty fetched successfully", data: faculty });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const createNewFaculty = async (req, res) => {
  try {
    const { errors, data } = validateFacultyPayload(req.body, false);
    if (errors.length > 0) {
      return errorResponse(res, { message: errors.join(", "), status: 400 });
    }

    const faculty = await createFaculty(data);
    return successResponse(res, { status: 201, message: "Faculty created successfully", data: faculty });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const updateExistingFaculty = async (req, res) => {
  try {
    const { errors, data } = validateFacultyPayload(req.body, true);
    if (errors.length > 0) {
      return errorResponse(res, { message: errors.join(", "), status: 400 });
    }

    const faculty = await updateFaculty(req.params.id, data);
    return successResponse(res, { message: "Faculty updated successfully", data: faculty });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const removeFaculty = async (req, res) => {
  try {
    await deleteFaculty(req.params.id);
    return successResponse(res, { message: "Faculty deleted successfully" });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const assignStudents = async (req, res) => {
  try {
    const { errors, data } = validateAssignmentPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, { message: errors.join(", "), status: 400 });
    }

    const faculty = await assignStudentsToFaculty(req.params.facultyId, data.studentIds);
    return successResponse(res, { message: "Students assigned successfully", data: faculty });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const unassignStudents = async (req, res) => {
  try {
    const { errors, data } = validateAssignmentPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, { message: errors.join(", "), status: 400 });
    }

    const faculty = await removeStudentsFromFaculty(req.params.facultyId, data.studentIds);
    return successResponse(res, { message: "Students removed successfully", data: faculty });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const getDashboard = async (req, res) => {
  try {
    const dashboard = await buildAdminDashboard();
    return successResponse(res, { message: "Admin dashboard fetched successfully", data: dashboard });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const getStatistics = async (req, res) => {
  try {
    const statistics = await buildAdminStatistics();
    return successResponse(res, { message: "Admin statistics fetched successfully", data: statistics });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const getStudentReport = async (req, res) => {
  try {
    const report = await buildAdminStudentReport();
    return successResponse(res, { message: "Admin student report fetched successfully", data: report });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const getFacultyReport = async (req, res) => {
  try {
    const report = await buildAdminFacultyReport();
    return successResponse(res, { message: "Admin faculty report fetched successfully", data: report });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const getAssessmentReport = async (req, res) => {
  try {
    const report = await buildAdminAssessmentReport();
    return successResponse(res, { message: "Admin assessment report fetched successfully", data: report });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  getProfile,
  getStudents,
  getStudent,
  createNewStudent,
  updateExistingStudent,
  removeStudent,
  getFaculties,
  getFaculty,
  createNewFaculty,
  updateExistingFaculty,
  removeFaculty,
  assignStudents,
  unassignStudents,
  getDashboard,
  getStatistics,
  getStudentReport,
  getFacultyReport,
  getAssessmentReport
};
