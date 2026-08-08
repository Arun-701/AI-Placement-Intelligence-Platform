const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
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
    analyzeStudentResume
);

router.post(
    "/resume-analysis/refresh",
    verifyToken,
    authorizeRoles("student"),
    refreshStudentResumeAnalysis
);

router.get(
    "/placement-recommendation",
    verifyToken,
    authorizeRoles("student"),
    fetchPlacementRecommendation
);

router.get(
    "/skill-gap",
    verifyToken,
    authorizeRoles("student"),
    getResumeSkillGapAnalysis
);

router.get(
    "/recommendations",
    verifyToken,
    authorizeRoles("student"),
    getResumeLearningRecommendations
);

module.exports = router;
