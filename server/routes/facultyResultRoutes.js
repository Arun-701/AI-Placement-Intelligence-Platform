const express = require("express");
const router = express.Router();

const {
    getAllResults,
    getStudentResults,
    getDetailedStudentResult,
    getDashboardStatistics
} = require("../controllers/facultyResultController");

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// All routes are protected and require faculty role
router.use(verifyToken, authorizeRoles("faculty"));

// Get all results (with optional assessment filter)
router.get("/", getAllResults);

// Get dashboard statistics
router.get("/dashboard/statistics", getDashboardStatistics);

// Get results for a specific student
router.get("/:studentId", getStudentResults);

// Get detailed result for a student's assessment
router.get("/:studentId/:resultId", getDetailedStudentResult);

module.exports = router;
