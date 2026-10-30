const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const controller = require("../controllers/adaptiveAssessmentController");

const router = express.Router();
router.post("/generate", verifyToken, authorizeRoles("student"), controller.generateAssessment);
router.get("/:id", verifyToken, authorizeRoles("student"), controller.getAssessment);
router.post("/:id/submit", verifyToken, authorizeRoles("student"), controller.submitAssessment);
router.get("/:id/result", verifyToken, authorizeRoles("student"), controller.getResult);
module.exports = router;
