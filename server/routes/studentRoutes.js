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
const upload = require("../middleware/uploadMiddleware");

router.get("/coding-profile", verifyToken, authorizeRoles("student"), getCodingProfile);
router.put("/coding-profile", verifyToken, authorizeRoles("student"), updateCodingProfile);
router.post("/resume", verifyToken, authorizeRoles("student"), upload.single("resume"), uploadResume);
router.get("/resume", verifyToken, authorizeRoles("student"), getResume);
router.put("/resume", verifyToken, authorizeRoles("student"), upload.single("resume"), replaceResume);
router.delete("/resume", verifyToken, authorizeRoles("student"), deleteResume);
router.get(
    "/dashboard",
    verifyToken,
    authorizeRoles("student"),
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
