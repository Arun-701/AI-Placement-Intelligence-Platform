const express = require("express");
const router = express.Router();

const {
    createAssessment,
    getAssessments,
    getInitialAssessment,
    getAssessmentById,
    updateAssessment,
    deleteAssessment
} = require("../controllers/assessmentController");

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.post("/", verifyToken, authorizeRoles("faculty"), createAssessment);
router.get("/", verifyToken, authorizeRoles("faculty"), getAssessments);
router.get("/initial", verifyToken, authorizeRoles("student"), getInitialAssessment);
router.get("/:id", verifyToken, authorizeRoles("faculty"), getAssessmentById);
router.put("/:id", verifyToken, authorizeRoles("faculty"), updateAssessment);
router.delete("/:id", verifyToken, authorizeRoles("faculty"), deleteAssessment);

module.exports = router;
