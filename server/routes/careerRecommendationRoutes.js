const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { requireAssignmentComplete } = require("../middleware/onboardingMiddleware");
const { getCareerRecommendation } = require("../controllers/careerRecommendationController");

router.get(
    "/career-recommendation",
    verifyToken,
    authorizeRoles("student"),
    requireAssignmentComplete,
    getCareerRecommendation
);

module.exports = router;
