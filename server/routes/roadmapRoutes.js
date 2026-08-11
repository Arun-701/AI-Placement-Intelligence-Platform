const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { requireAssignmentComplete } = require("../middleware/onboardingMiddleware");
const {
    getRoadmap,
    getMyRoadmap,
    generateRoadmap,
    updateRoadmapMilestone,
    getRoadmapProgress,
    updateProgress
} = require("../controllers/roadmapController");

router.get("/roadmap", verifyToken, authorizeRoles("student"), requireAssignmentComplete, getRoadmap);
router.post("/roadmap/generate", verifyToken, authorizeRoles("student"), requireAssignmentComplete, generateRoadmap);
router.patch("/roadmap/milestone/:id", verifyToken, authorizeRoles("student"), requireAssignmentComplete, updateRoadmapMilestone);
router.get("/roadmap/progress", verifyToken, authorizeRoles("student"), requireAssignmentComplete, getRoadmapProgress);
router.get("/roadmap/me", verifyToken, authorizeRoles("student"), requireAssignmentComplete, getMyRoadmap);
router.put("/roadmap/progress", verifyToken, authorizeRoles("student"), requireAssignmentComplete, updateProgress);

module.exports = router;
