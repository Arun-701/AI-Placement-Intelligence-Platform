const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const {
    getRoadmap,
    getMyRoadmap,
    generateRoadmap,
    updateRoadmapMilestone,
    getRoadmapProgress,
    updateProgress
} = require("../controllers/roadmapController");

router.get("/roadmap", verifyToken, authorizeRoles("student"), getRoadmap);
router.post("/roadmap/generate", verifyToken, authorizeRoles("student"), generateRoadmap);
router.patch("/roadmap/milestone/:id", verifyToken, authorizeRoles("student"), updateRoadmapMilestone);
router.get("/roadmap/progress", verifyToken, authorizeRoles("student"), getRoadmapProgress);
router.get("/roadmap/me", verifyToken, authorizeRoles("student"), getMyRoadmap);
router.put("/roadmap/progress", verifyToken, authorizeRoles("student"), updateProgress);

module.exports = router;
