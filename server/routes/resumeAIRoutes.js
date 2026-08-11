const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { requireAssignmentComplete } = require("../middleware/onboardingMiddleware");
const {
    analyzeStudentResume,
    refreshStudentResumeAnalysis,
    fetchPlacementRecommendation,
    getResumeSkillGapAnalysis,
    getResumeLearningRecommendations
} = require("../controllers/resumeAIController");

router.get(
    "/resume-analysis",
    verifyToken,
    authorizeRoles("student"),
    requireAssignmentComplete,
    analyzeStudentResume
);

router.post(
    "/resume-analysis/refresh",
    verifyToken,
    authorizeRoles("student"),
    requireAssignmentComplete,
    refreshStudentResumeAnalysis
);

router.get(
    "/placement-recommendation",
    verifyToken,
    authorizeRoles("student"),
    requireAssignmentComplete,
    fetchPlacementRecommendation
);

router.get(
    "/skill-gap",
    verifyToken,
    authorizeRoles("student"),
    requireAssignmentComplete,
    getResumeSkillGapAnalysis
);

router.get(
    "/recommendations",
    verifyToken,
    authorizeRoles("student"),
    requireAssignmentComplete,
    getResumeLearningRecommendations
);

module.exports = router;
