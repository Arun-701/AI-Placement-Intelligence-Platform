const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { requireAssignmentComplete } = require("../middleware/onboardingMiddleware");
const {
    analyzeResumeWithJobDescription,
    getRecentAnalysis
} = require("../controllers/resumeJDController");

router.post(
    "/analyze-resume-jd",
    verifyToken,
    authorizeRoles("student"),
    requireAssignmentComplete,
    analyzeResumeWithJobDescription
);

router.get(
    "/resume-jd-analysis",
    verifyToken,
    authorizeRoles("student"),
    requireAssignmentComplete,
    getRecentAnalysis
);

module.exports = router;
