const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const {
    getStudentDashboard,
    getFacultyDashboard,
    getStudentAnalytics,
    getFacultyAnalytics,
    getPlacementAnalytics,
    getStudentReport,
    getFacultyReport,
    getAssessmentReport
} = require("../controllers/dashboardController");

router.get("/dashboard/student", verifyToken, authorizeRoles("student"), getStudentDashboard);
router.get("/dashboard/faculty", verifyToken, authorizeRoles("faculty"), getFacultyDashboard);
router.get("/dashboard/student/analytics", verifyToken, authorizeRoles("student"), getStudentAnalytics);
router.get("/dashboard/faculty/analytics", verifyToken, authorizeRoles("faculty"), getFacultyAnalytics);
router.get("/dashboard/placement-analytics", verifyToken, authorizeRoles("student", "faculty"), getPlacementAnalytics);
router.get("/dashboard/reports/student", verifyToken, authorizeRoles("student"), getStudentReport);
router.get("/dashboard/reports/faculty", verifyToken, authorizeRoles("faculty"), getFacultyReport);
router.get("/dashboard/reports/assessment", verifyToken, authorizeRoles("faculty"), getAssessmentReport);

module.exports = router;
