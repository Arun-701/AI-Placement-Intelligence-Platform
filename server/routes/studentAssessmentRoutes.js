const express = require("express");
const router = express.Router();

const {
    getMyAssessments,
    startAssessmentAttempt,
    autoSaveAssessmentAttempt,
    submitAssessmentAttempt,
    getMyAssessmentHistory,
    getMyAssessmentResult,
    getReadinessScore
} = require("../controllers/studentAssessmentController");

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// All routes are protected and require student role
const studentOnly = [verifyToken, authorizeRoles("student")];

// Get all assigned assessments
router.get("/my", studentOnly, getMyAssessments);

// Start an assessment
router.post("/:id/start", studentOnly, startAssessmentAttempt);

// Auto-save assessment attempt
router.post("/:id/auto-save", studentOnly, autoSaveAssessmentAttempt);

// Submit assessment for evaluation
router.post("/:id/submit", studentOnly, submitAssessmentAttempt);

// Get assessment attempt history
router.get("/history", studentOnly, getMyAssessmentHistory);

// Get detailed assessment result
router.get("/result/:resultId", studentOnly, getMyAssessmentResult);

// Get student's placement readiness score
router.get("/readiness-score", studentOnly, getReadinessScore);

module.exports = router;
