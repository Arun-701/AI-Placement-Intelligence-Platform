const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { requireAssignmentComplete } = require("../middleware/onboardingMiddleware");
const upload = require("../middleware/uploadMiddleware");
const uploadJobDescription = require("../middleware/jobDescriptionUploadMiddleware");
const {
    analyzeResumeWithJobDescription,
    extractJobDescription,
    getRecentAnalysis,
    getAnalysisById
} = require("../controllers/resumeJDController");

router.post(
    "/resume-jd/extract",
    verifyToken,
    authorizeRoles("student"),
    requireAssignmentComplete,
    uploadJobDescription("jobDescription"),
    extractJobDescription
);

router.post(
    "/analyze-resume-jd",
    verifyToken,
    authorizeRoles("student"),
    requireAssignmentComplete,
    upload.optionalFields([
        { name: "resume", maxCount: 1 },
        { name: "jobDescriptionFile", maxCount: 1 }
    ]),
    analyzeResumeWithJobDescription
);

router.get(
    "/resume-jd-analysis",
    verifyToken,
    authorizeRoles("student"),
    requireAssignmentComplete,
    getRecentAnalysis
);

router.get(
    "/resume-jd-analysis/:analysisId",
    verifyToken,
    authorizeRoles("student"),
    requireAssignmentComplete,
    getAnalysisById
);

module.exports = router;
