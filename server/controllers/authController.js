const crypto = require("crypto");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { successResponse, errorResponse } = require("../utils/response");
const { validateFacultyRegistration, validateFacultyLogin } = require("../validators/facultyValidator");

const validateEmail = (email) => {
    return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const isStrongPassword = (password) => {
    return typeof password === "string"
        && password.length >= 8
        && /[A-Z]/.test(password)
        && /[a-z]/.test(password)
        && /\d/.test(password)
        && /[^A-Za-z0-9]/.test(password);
};

const createToken = () => crypto.randomBytes(20).toString("hex");
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const registerStudent = async (req, res) => {
    try {
        const { name, email, password, department, year, skills, cgpa } = req.body;

        if (!name || typeof name !== "string" || name.trim().length < 2) {
            return errorResponse(res, { message: "Valid name is required", status: 400 });
        }

        if (!validateEmail(email)) {
            return errorResponse(res, { message: "Valid email is required", status: 400 });
        }

        if (!isStrongPassword(password)) {
            return errorResponse(res, { message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character", status: 400 });
        }

        if (!department || typeof department !== "string" || department.trim().length < 2) {
            return errorResponse(res, { message: "Valid department is required", status: 400 });
        }

        if (!Number.isInteger(year) || year < 1 || year > 8) {
            return errorResponse(res, { message: "Year must be a whole number between 1 and 8", status: 400 });
        }

        const studentExists = await Student.findOne({ email: email.trim().toLowerCase() });

        if (studentExists) {
            return errorResponse(res, { message: "Student already exists", status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = createToken();
        console.log("BODY =", JSON.stringify(req.body, null, 2));
        console.log("GENDER =", req.body.gender);
        const student = await Student.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            department: department.trim(),
            year,
            gender: req.body.gender,
            skills,
            cgpa,
            verificationToken: hashToken(verificationToken),
            isVerified: false,
            passwordChangedAt: new Date()
        });

        return successResponse(res, {
            status: 201,
            message: "Student Registered Successfully. Please verify your email.",
            data: {
                student: {
                    _id: student._id,
                    name: student.name,
                    email: student.email,
                    isVerified: student.isVerified
                },
                verificationToken: process.env.NODE_ENV !== "production" ? verificationToken : undefined
            }
        });

    } catch (error) {
        console.error(error);
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const loginStudent = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!validateEmail(email)) {
            return errorResponse(res, { message: "Valid email is required", status: 400 });
        }

        if (typeof password !== "string" || password.trim() === "") {
            return errorResponse(res, { message: "Password is required", status: 400 });
        }

        const student = await Student.findOne({ email: email.trim().toLowerCase() });

        if (!student) {
            return errorResponse(res, { message: "Invalid Email or Password", status: 400 });
        }

        if (!student.isActive) {
            return errorResponse(res, { message: "Account is deactivated", status: 403 });
        }

        const isMatch = await bcrypt.compare(password, student.password);

        if (!isMatch) {
            return errorResponse(res, { message: "Invalid Email or Password", status: 400 });
        }

        if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !student.isVerified) {
            return errorResponse(res, { message: "Please verify your email before logging in", status: 403 });
        }

        const token = jwt.sign(
            { id: student._id, role: student.role || "student" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        const { password: pwd, ...studentData } = student.toObject();

        return successResponse(res, { message: "Login Successful", data: { token, student: studentData } });

    } catch (error) {
        console.error(error);
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const getProfile = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id).select("-password");
        return successResponse(res, { data: student });

    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (typeof currentPassword !== "string" || currentPassword.trim() === "") {
            return errorResponse(res, { message: "Current password is required", status: 400 });
        }

        if (!isStrongPassword(newPassword)) {
            return errorResponse(res, { message: "New password must be at least 8 characters and include uppercase, lowercase, number, and special character", status: 400 });
        }

        const student = await Student.findById(req.user.id);

        if (!student) {
            return errorResponse(res, { message: "Student not found", status: 404 });
        }

        const isMatch = await bcrypt.compare(currentPassword, student.password);

        if (!isMatch) {
            return errorResponse(res, { message: "Current password is incorrect", status: 400 });
        }

        student.password = await bcrypt.hash(newPassword, 10);
        student.passwordChangedAt = new Date();
        await student.save();

        return successResponse(res, { message: "Password changed successfully" });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!validateEmail(email)) {
            return errorResponse(res, { message: "Valid email is required", status: 400 });
        }

        const student = await Student.findOne({ email: email.trim().toLowerCase() });

        if (!student) {
            return successResponse(res, { message: "If an account exists, password reset instructions have been sent" });
        }

        const resetToken = createToken();
        student.resetPasswordToken = hashToken(resetToken);
        student.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
        student.passwordChangedAt = student.passwordChangedAt || new Date();
        await student.save();

        return successResponse(res, {
            message: "If an account exists, password reset instructions have been sent",
            data: { resetToken: process.env.NODE_ENV !== "production" ? resetToken : undefined }
        });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (typeof token !== "string" || token.trim() === "") {
            return errorResponse(res, { message: "Reset token is required", status: 400 });
        }

        if (!isStrongPassword(newPassword)) {
            return errorResponse(res, { message: "New password must be at least 8 characters and include uppercase, lowercase, number, and special character", status: 400 });
        }

        const student = await Student.findOne({
            resetPasswordToken: hashToken(token),
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!student) {
            return errorResponse(res, { message: "Invalid or expired reset token", status: 400 });
        }

        student.password = await bcrypt.hash(newPassword, 10);
        student.resetPasswordToken = "";
        student.resetPasswordExpires = null;
        student.passwordChangedAt = new Date();
        await student.save();

        return successResponse(res, { message: "Password reset successfully" });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;

        if (typeof token !== "string" || token.trim() === "") {
            return errorResponse(res, { message: "Verification token is required", status: 400 });
        }

        const student = await Student.findOne({ verificationToken: hashToken(token) });

        if (!student) {
            return errorResponse(res, { message: "Invalid or expired verification token", status: 400 });
        }

        student.isVerified = true;
        student.verificationToken = "";
        await student.save();

        return successResponse(res, { message: "Email verified successfully" });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const updateAccountStatus = async (req, res) => {
    try {
        const { isActive } = req.body;

        if (typeof isActive !== "boolean") {
            return errorResponse(res, { message: "isActive must be a boolean", status: 400 });
        }

        const student = await Student.findById(req.user.id);

        if (!student) {
            return errorResponse(res, { message: "Student not found", status: 404 });
        }

        student.isActive = isActive;
        await student.save();

        return successResponse(res, { message: isActive ? "Account activated successfully" : "Account deactivated successfully", data: { isActive: student.isActive } });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const uploadResume = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id);

        if (!student) {
            return errorResponse(res, { message: "Student not found", status: 404 });
        }

        if (!req.file || !req.file.path) {
            return errorResponse(res, { message: "Resume file is required", status: 400 });
        }

        student.resume = req.file.path;
        await student.save();

        return successResponse(res, {
            message: "Resume uploaded successfully.",
            data: { resume: student.resume }
        });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

// Faculty Authentication Methods
const registerFaculty = async (req, res) => {
    try {
        const { name, email, password, department, designation } = req.body;

        // Validate input
        const { errors, data } = validateFacultyRegistration({ name, email, password, department, designation });
        if (errors.length > 0) {
            return errorResponse(res, { message: errors[0], status: 400 });
        }

        // Check if faculty already exists
        const facultyExists = await Faculty.findOne({ email: data.email });
        if (facultyExists) {
            return errorResponse(res, { message: "Faculty with this email already exists", status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Create new faculty
        const faculty = await Faculty.create({
            name: data.name,
            email: data.email,
            password: hashedPassword,
            department: data.department,
            designation: data.designation,
            role: "faculty",
            isActive: true,
            passwordChangedAt: new Date()
        });

        return successResponse(res, {
            status: 201,
            message: "Faculty registered successfully",
            data: {
                faculty: {
                    _id: faculty._id,
                    name: faculty.name,
                    email: faculty.email,
                    department: faculty.department,
                    designation: faculty.designation,
                    role: faculty.role
                }
            }
        });

    } catch (error) {
        console.error(error);
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const loginFaculty = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        const { errors, data } = validateFacultyLogin({ email, password });
        if (errors.length > 0) {
            return errorResponse(res, { message: errors[0], status: 400 });
        }

        // Find faculty by email
        const faculty = await Faculty.findOne({ email: data.email });
        if (!faculty) {
            return errorResponse(res, { message: "Invalid Email or Password", status: 400 });
        }

        // Check if account is active
        if (!faculty.isActive) {
            return errorResponse(res, { message: "Account is deactivated", status: 403 });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(data.password, faculty.password);
        if (!isMatch) {
            return errorResponse(res, { message: "Invalid Email or Password", status: 400 });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: faculty._id, role: faculty.role || "faculty" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Return response without password
        const { password: pwd, ...facultyData } = faculty.toObject();

        return successResponse(res, {
            message: "Faculty login successful",
            data: {
                token,
                faculty: facultyData
            }
        });

    } catch (error) {
        console.error(error);
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

module.exports = {
    registerStudent,
    loginStudent,
    getProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    updateAccountStatus,
    uploadResume,
    registerFaculty,
    loginFaculty
};