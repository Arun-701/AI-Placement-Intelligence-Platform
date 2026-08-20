const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { authLimiter } = require("../middleware/rateLimit");
const {
  registerAdmin,
  loginAdmin,
  forgotPasswordAdmin,
  resetPasswordAdmin,
  getProfile,
  getStudents,
  getStudent,
  createNewStudent,
  updateExistingStudent,
  removeStudent,
  getFaculties,
  getFaculty,
  createNewFaculty,
  updateExistingFaculty,
  removeFaculty,
  approveFaculty,
  assignStudents,
  unassignStudents,
  getDashboard,
  getStatistics,
  getStudentReport,
  getFacultyReport,
  getAssessmentReport
} = require("../controllers/adminController");

// Authentication
router.post("/register", authLimiter, registerAdmin);
router.post("/login", authLimiter, loginAdmin);
router.post("/forgot-password", authLimiter, forgotPasswordAdmin);
router.post("/reset-password", authLimiter, resetPasswordAdmin);

// Admin profile
router.get("/profile", verifyToken, authorizeRoles("admin"), getProfile);

// Student management
router.get("/students", verifyToken, authorizeRoles("admin"), getStudents);
router.get("/students/:id", verifyToken, authorizeRoles("admin"), getStudent);
router.post("/students", verifyToken, authorizeRoles("admin"), createNewStudent);
router.put("/students/:id", verifyToken, authorizeRoles("admin"), updateExistingStudent);
router.delete("/students/:id", verifyToken, authorizeRoles("admin"), removeStudent);

// Faculty management
router.get("/faculties", verifyToken, authorizeRoles("admin"), getFaculties);
router.get("/faculties/:id", verifyToken, authorizeRoles("admin"), getFaculty);
router.post("/faculties", verifyToken, authorizeRoles("admin"), createNewFaculty);
router.put("/faculties/:id", verifyToken, authorizeRoles("admin"), updateExistingFaculty);
router.delete("/faculties/:id", verifyToken, authorizeRoles("admin"), removeFaculty);
router.patch("/faculties/:id/approve", verifyToken, authorizeRoles("admin"), approveFaculty);

// Assignment management
router.post("/faculties/:facultyId/assign-students", verifyToken, authorizeRoles("admin"), assignStudents);
router.post("/faculties/:facultyId/remove-students", verifyToken, authorizeRoles("admin"), unassignStudents);

// Admin dashboard and reports
router.get("/dashboard", verifyToken, authorizeRoles("admin"), getDashboard);
router.get("/statistics", verifyToken, authorizeRoles("admin"), getStatistics);
router.get("/reports/students", verifyToken, authorizeRoles("admin"), getStudentReport);
router.get("/reports/faculties", verifyToken, authorizeRoles("admin"), getFacultyReport);
router.get("/reports/assessments", verifyToken, authorizeRoles("admin"), getAssessmentReport);

module.exports = router;
