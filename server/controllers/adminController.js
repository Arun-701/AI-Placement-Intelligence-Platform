const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { successResponse, errorResponse } = require("../utils/response");
const Admin = require("../models/Admin");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const { sendVerificationOtpEmail, sendFacultyApprovalEmail } = require("../services/emailService");
const {
  validateAdminRegistration,
  validateAdminLogin,
  validateStudentPayload,
  validateFacultyPayload,
  validateAssignmentPayload,
  validateEmail,
  isStrongPassword
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

const issueVerificationOtp = async (admin) => {
  const otp = crypto.randomInt(100000, 1000000).toString();
  admin.emailVerificationOtpHash = crypto.createHash("sha256").update(otp).digest("hex");
  admin.emailVerificationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  admin.emailVerificationOtpAttempts = 0;
  admin.emailVerificationLastSentAt = new Date();
  await admin.save();
  try {
    await sendVerificationOtpEmail({ email: admin.email, name: admin.name, otp });
  } catch (error) {
    admin.emailVerificationOtpHash = "";
    admin.emailVerificationOtpExpiresAt = null;
    admin.emailVerificationOtpAttempts = 0;
    admin.emailVerificationLastSentAt = null;
    await admin.save();
    throw error;
  }
};

const registerAdmin = async (req, res) => {
  try {
    const { errors, data } = validateAdminRegistration(req.body);
    if (errors.length > 0) {
      return errorResponse(res, { message: errors[0], status: 400 });
    }

    const [existingAdmin, existingStudent, existingFaculty] = await Promise.all([
      Admin.findOne({ email: data.email }),
      Student.findOne({ email: data.email }),
      Faculty.findOne({ email: data.email })
    ]);
    if (existingAdmin || existingStudent || existingFaculty) {
      return errorResponse(res, { message: "Email already registered. Please login or verify your existing account.", status: 409 });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const admin = await Admin.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: "admin",
      isActive: true,
      isVerified: false,
      emailVerificationRequired: true,
      passwordChangedAt: new Date()
    });

    try {
      await issueVerificationOtp(admin);
    } catch (emailError) {
      console.error("Email verification delivery failed");
      const message = "Account created, but we could not send a verification email. Please try resending it later.";
      return errorResponse(res, { message, status: 503 });
    }
    const adminData = { _id: admin._id, name: admin.name, email: admin.email, role: admin.role };

    return successResponse(res, {
      status: 201,
      message: "Account created successfully. We've sent a 6-digit verification code to your email. Please enter the code to verify your email address.",
      data: { admin: adminData }
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return errorResponse(res, { message: "Email already registered. Please login or verify your existing account.", status: 409 });
    }
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

    if (admin.emailVerificationRequired === true && admin.isVerified !== true) {
      return errorResponse(res, { message: "Please verify your email before logging in", status: 403 });
    }

    const token = createToken(admin._id);
    const sanitizedAdmin = { _id: admin._id, name: admin.name, email: admin.email, role: admin.role };

    return successResponse(res, { message: "Admin login successful", data: { token, admin: sanitizedAdmin } });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const forgotPasswordAdmin = async (req, res) => {
  try {
    const { email } = req.body;

    if (!validateEmail(email)) {
      return errorResponse(res, { message: "Valid email is required", status: 400 });
    }

    const admin = await Admin.findOne({ email: email.trim().toLowerCase() });

    if (!admin) {
      return successResponse(res, { message: "If an account exists, password reset instructions have been sent" });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    admin.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    admin.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    admin.passwordChangedAt = admin.passwordChangedAt || new Date();
    await admin.save();

    return successResponse(res, {
      message: "If an account exists, password reset instructions have been sent",
      data: { resetToken: process.env.NODE_ENV !== "production" ? resetToken : undefined }
    });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const resetPasswordAdmin = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (typeof token !== "string" || token.trim() === "") {
      return errorResponse(res, { message: "Reset token is required", status: 400 });
    }

    if (!isStrongPassword(newPassword)) {
      return errorResponse(res, { message: "New password must be at least 8 characters and include uppercase, lowercase, number, and special character", status: 400 });
    }

    const admin = await Admin.findOne({
      resetPasswordToken: crypto.createHash("sha256").update(token).digest("hex"),
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!admin) {
      return errorResponse(res, { message: "Invalid or expired reset token", status: 400 });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    admin.resetPasswordToken = "";
    admin.resetPasswordExpires = null;
    admin.passwordChangedAt = new Date();
    await admin.save();

    return successResponse(res, { message: "Password reset successfully" });
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

const approveFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return errorResponse(res, { message: "Faculty not found", status: 404 });
    if (faculty.emailVerificationRequired === true && faculty.isVerified !== true) {
      return errorResponse(res, { message: "Faculty must verify their email before approval", status: 400 });
    }
    if (faculty.approvalStatus === "APPROVED") {
      return successResponse(res, { message: "Faculty is already approved" });
    }

    try {
      await sendFacultyApprovalEmail({ email: faculty.email, name: faculty.name });
    } catch (emailError) {
      console.error("Faculty approval email delivery failed", emailError);
      return errorResponse(res, { message: "Approval email could not be sent. The faculty remains pending approval.", status: 503 });
    }
    faculty.approvalStatus = "APPROVED";
    await faculty.save();
    return successResponse(res, { message: "Faculty approved and approval email sent", data: { faculty: { _id: faculty._id, approvalStatus: faculty.approvalStatus } } });
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
  approveFaculty,
  assignStudents,
  unassignStudents,
  getDashboard,
  getStatistics,
  getStudentReport,
  getFacultyReport,
  getAssessmentReport,
  forgotPasswordAdmin,
  resetPasswordAdmin
};
