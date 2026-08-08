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
router.use(verifyToken, authorizeRoles("student"));

// Get all assigned assessments
router.get("/my", getMyAssessments);

// Start an assessment
router.post("/:id/start", startAssessmentAttempt);

// Auto-save assessment attempt
router.post("/:id/auto-save", autoSaveAssessmentAttempt);

// Submit assessment for evaluation
router.post("/:id/submit", submitAssessmentAttempt);

// Get assessment attempt history
router.get("/history", getMyAssessmentHistory);

// Get detailed assessment result
router.get("/result/:resultId", getMyAssessmentResult);

// Get student's placement readiness score
router.get("/readiness-score", getReadinessScore);

module.exports = router;
