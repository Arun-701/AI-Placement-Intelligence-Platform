/**
 * AI Mentor Routes
 * Endpoints for student AI Mentor question analysis
 */

const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const uploadMiddleware = require("../middleware/aiMentorUploadMiddleware");
const aiMentorService = require("../services/aiMentorService");
const fs = require("fs/promises");

/**
 * POST /api/ai/mentor/analyze
 * Analyze questions from file upload or pasted text
 * Body:
 *   - file (multipart): PDF, DOCX, or TXT file
 *   OR
 *   - questionText (string): Pasted question text
 */
router.post(
    "/analyze",
    verifyToken,
    authorizeRoles("student"),
    uploadMiddleware.single("file"),
    async (req, res) => {
        let tempFilePath = null;

        try {
            // Check if file or text provided
            if (!req.file && !req.body.questionText) {
                return res.status(400).json({
                    success: false,
                    error: "Please provide either a file (PDF/DOCX/TXT) or question text"
                });
            }

            let analysis;

            if (req.file) {
                // File upload path
                tempFilePath = req.file.path;
                analysis = await aiMentorService.analyzeQuestionsFromUpload(
                    tempFilePath,
                    req.file.originalname
                );
            } else {
                // Text input path
                analysis = aiMentorService.analyzeQuestionsFromText(req.body.questionText);
            }

            res.json({
                success: true,
                data: analysis,
                studentId: req.user._id // Include for tracking
            });
        } catch (error) {
            console.error("[AI Mentor] Analysis error:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to analyze questions"
            });
        } finally {
            // Clean up temp file if uploaded
            if (tempFilePath) {
                try {
                    await fs.unlink(tempFilePath);
                } catch (e) {
                    console.warn("Failed to delete temp file:", e.message);
                }
            }
        }
    }
);

/**
 * GET /api/ai/mentor/topics
 * Get available topics taxonomy
 */
router.get("/topics", verifyToken, authorizeRoles("student"), (req, res) => {
    try {
        const topics = aiMentorService.getTopics();
        res.json({
            success: true,
            data: topics
        });
    } catch (error) {
        console.error("[AI Mentor] Topics error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch topics"
        });
    }
});

module.exports = router;
