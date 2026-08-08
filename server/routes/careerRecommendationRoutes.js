const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { getCareerRecommendation } = require("../controllers/careerRecommendationController");

router.get(
    "/career-recommendation",
    verifyToken,
    authorizeRoles("student"),
    getCareerRecommendation
);

module.exports = router;
