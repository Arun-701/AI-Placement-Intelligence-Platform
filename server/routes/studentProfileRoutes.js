const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const {
  getProfile,
  updateProfile,
  getProfileCompletion,
  getDashboard
} = require("../controllers/studentProfileController");

router.get("/dashboard", verifyToken, authorizeRoles("student"), getDashboard);
router.get("/profile", verifyToken, authorizeRoles("student"), getProfile);
router.put("/profile", verifyToken, authorizeRoles("student"), updateProfile);
router.get("/profile-completion", verifyToken, authorizeRoles("student"), getProfileCompletion);

module.exports = router;
