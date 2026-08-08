const express = require("express");
const router = express.Router();

const {
    getProfile,
    getAssignedStudents,
    getAssignedAssessments,
    getDashboard
} = require("../controllers/facultyController");

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.get("/profile", verifyToken, authorizeRoles("faculty"), getProfile);
router.get("/dashboard", verifyToken, authorizeRoles("faculty"), getDashboard);
router.get("/students", verifyToken, authorizeRoles("faculty"), getAssignedStudents);
router.get("/assessments", verifyToken, authorizeRoles("faculty"), getAssignedAssessments);

module.exports = router;
