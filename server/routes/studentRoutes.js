const express = require("express");
const router = express.Router();

const {
    getCodingProfile,
    updateCodingProfile,
    uploadResume,
    getResume,
    replaceResume,
    deleteResume
} = require("../controllers/studentController");
const {
    getProfile,
    updateProfile,
    getProfileCompletion,
    getDashboard
} = require("../controllers/studentProfileController");

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { requireProfileComplete, requireAssignmentComplete } = require("../middleware/onboardingMiddleware");
const upload = require("../middleware/uploadMiddleware");

// These routes require the student to have completed onboarding (profile + assignment)
router.get("/coding-profile", verifyToken, authorizeRoles("student"), requireAssignmentComplete, getCodingProfile);
router.put("/coding-profile", verifyToken, authorizeRoles("student"), requireAssignmentComplete, updateCodingProfile);
router.post("/resume", verifyToken, authorizeRoles("student"), requireAssignmentComplete, upload.single("resume"), uploadResume);
router.get("/resume", verifyToken, authorizeRoles("student"), requireAssignmentComplete, getResume);
router.put("/resume", verifyToken, authorizeRoles("student"), requireAssignmentComplete, upload.single("resume"), replaceResume);
router.delete("/resume", verifyToken, authorizeRoles("student"), requireAssignmentComplete, deleteResume);
router.get(
    "/dashboard",
    verifyToken,
    authorizeRoles("student"),
    requireAssignmentComplete,
    getDashboard
);
router.get(
    "/profile",
    verifyToken,
    authorizeRoles("student"),
    getProfile
);

router.put(
    "/profile",
    verifyToken,
    authorizeRoles("student"),
    updateProfile
);

router.get(
    "/profile-completion",
    verifyToken,
    authorizeRoles("student"),
    getProfileCompletion
);

module.exports = router;
