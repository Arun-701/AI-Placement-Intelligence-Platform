const express = require("express");
const router = express.Router();

const {
    registerStudent,
    loginStudent,
    getProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmailOtp,
    resendVerificationEmail,
    updateAccountStatus,
    uploadResume,
    registerFaculty,
    loginFaculty,
    forgotPasswordFaculty,
    resetPasswordFaculty
} = require("../controllers/authController");

const verifyToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { authLimiter } = require("../middleware/rateLimit");

// Student Routes - Public (rate-limited)
router.post("/register", authLimiter, registerStudent);
router.post("/login", authLimiter, loginStudent);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.post("/verify-email-otp", authLimiter, verifyEmailOtp);
router.post("/resend-verification", authLimiter, resendVerificationEmail);

// Faculty Routes - Public (rate-limited)
router.post("/faculty/register", authLimiter, registerFaculty);
router.post("/faculty/login", authLimiter, loginFaculty);
router.post("/faculty/forgot-password", authLimiter, forgotPasswordFaculty);
router.post("/faculty/reset-password", authLimiter, resetPasswordFaculty);

// Student Protected Routes
router.get("/profile", verifyToken, getProfile);
router.post("/change-password", verifyToken, changePassword);
router.patch("/account-status", verifyToken, updateAccountStatus);

router.post(
    "/upload-resume",
    verifyToken,
    upload.single("resume"),
    uploadResume
);

module.exports = router;
