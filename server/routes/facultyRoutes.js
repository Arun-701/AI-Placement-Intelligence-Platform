const express = require("express");
const router = express.Router();

const {
    getProfile,
    getAssignedStudents,
    getDashboard
} = require("../controllers/facultyController");

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { getFacultyStudentDetails } = require("../controllers/studentDetailsController");

router.get("/profile", verifyToken, authorizeRoles("faculty"), getProfile);
router.get("/dashboard", verifyToken, authorizeRoles("faculty"), getDashboard);
router.get("/students", verifyToken, authorizeRoles("faculty"), getAssignedStudents);
router.get("/students/:id/details", verifyToken, authorizeRoles("faculty"), getFacultyStudentDetails);

module.exports = router;
