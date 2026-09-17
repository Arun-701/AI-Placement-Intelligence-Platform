const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const questionPaperUploadMiddleware = require("../middleware/questionPaperUploadMiddleware");
const { analyzeQuestionPaper } = require("../controllers/questionPaperAnalysisController");

/**
 * POST /api/ai/question-paper/analyze
 * 
 * Analyzes a question paper (PDF or image) and extracts:
 * - Questions
 * - Topics (domain + specific topic)
 * - Difficulty levels
 * - Priority scores
 * - Recommended study order
 * - Confidence scores
 * 
 * Protected by:
 * - JWT authentication (verifyToken)
 * - Role-based authorization (student only)
 * - File upload validation (Multer)
 * 
 * Request: POST /api/ai/question-paper/analyze
 * Content-Type: multipart/form-data
 * Body: file (PDF or image)
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Question paper analysis completed successfully",
 *   "data": {
 *     "totalQuestions": 15,
 *     "extractionMethod": "PDF|OCR|TEXT",
 *     "pagesProcessed": 3,
 *     "topics": [
 *       {
 *         "subject": "Computer Science",
 *         "domain": "Computer Networks",
 *         "topic": "TCP/IP",
 *         "questionCount": 4,
 *         "difficulty": "Medium",
 *         "priorityScore": 75,
 *         "priority": "High",
 *         "confidence": 0.92,
 *         "subtopics": ["routing", "protocol"],
 *         "source": "ml"
 *       }
 *     ],
 *     "subjectDistribution": {"Computer Science": 15},
 *     "difficultyDistribution": {"Easy": 3, "Medium": 8, "Hard": 4},
 *     "recommendedStudyOrder": ["TCP/IP", "DNS", "HTTP"],
 *     "mlQuestions": 15,
 *     "geminiQuestions": 0,
 *     "geminiUsed": false
 *   }
 * }
 */
router.post(
    "/question-paper/analyze",
    verifyToken,
    authorizeRoles("student"),
    questionPaperUploadMiddleware.single("file"),
    analyzeQuestionPaper
);

module.exports = router;
