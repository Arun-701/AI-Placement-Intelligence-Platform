const { successResponse, errorResponse } = require("../utils/response");
const { analyzeQuestionPaperFile } = require("../services/questionPaperAnalysisService");

const analyzeQuestionPaper = async (req, res) => {
    try {
        // Validate file was uploaded
        if (!req.file) {
            return errorResponse(res, {
                message: "No file uploaded. Please select a PDF or image file.",
                status: 400
            });
        }

        // Get file details
        const fileBuffer = req.file.buffer;
        const mimeType = req.file.mimetype;
        const fileName = req.file.originalname;

        // Validate file has content
        if (!fileBuffer || fileBuffer.length === 0) {
            return errorResponse(res, {
                message: "Uploaded file is empty.",
                status: 400
            });
        }

        // Call analysis service
        const analysis = await analyzeQuestionPaperFile(fileBuffer, mimeType, fileName);

        // Return success response
        return successResponse(res, {
            message: "Question paper analysis completed successfully",
            data: analysis,
            status: 200
        });
    } catch (error) {
        // Log error for debugging
        console.error("[questionPaperAnalysisController] Error:", error.message);

        // Handle specific Python service errors
        if (error.message.includes("Python service")) {
            return errorResponse(res, {
                message: "Analysis service is currently unavailable. Please try again later.",
                status: 503
            });
        }

        if (error.message.includes("timeout")) {
            return errorResponse(res, {
                message: "Analysis took too long. Please try with a smaller file.",
                status: 408
            });
        }

        if (error.message.includes("No valid questions found")) {
            return errorResponse(res, {
                message: "No questions found in the uploaded file. Please ensure the file contains valid question paper content.",
                status: 422
            });
        }

        // Generic error response (don't expose stack traces)
        return errorResponse(res, {
            message: error.message || "Failed to analyze question paper",
            status: error.status || 500
        });
    }
};

module.exports = {
    analyzeQuestionPaper
};
