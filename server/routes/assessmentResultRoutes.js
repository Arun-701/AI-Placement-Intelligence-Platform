const express = require("express");
const router = express.Router();

const {
    submitResult,
    getMyResults,
    getAssessmentResults,
    getResultById,
    updateFeedback
} = require("../controllers/assessmentResultController");

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.post("/", verifyToken, authorizeRoles("student"), submitResult);
router.get("/my", verifyToken, authorizeRoles("student"), getMyResults);
router.get("/assessment/:assessmentId", verifyToken, authorizeRoles("faculty"), getAssessmentResults);
router.get("/:id", verifyToken, authorizeRoles("student", "faculty"), getResultById);
router.put("/:id/feedback", verifyToken, authorizeRoles("faculty"), updateFeedback);

module.exports = router;
