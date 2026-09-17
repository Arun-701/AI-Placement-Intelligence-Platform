const PYTHON_SERVICE_URL = process.env.QUESTION_ANALYSIS_SERVICE_URL || "http://127.0.0.1:8000";
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Analyzes a question paper file by forwarding it to the Python FastAPI service.
 * 
 * @param {Buffer} fileBuffer - The file content as a Buffer
 * @param {string} mimeType - The MIME type of the file (application/pdf, image/jpeg, etc.)
 * @param {string} fileName - The original file name
 * @returns {Promise<Object>} Analysis result with topics, difficulty, priority, study order
 * @throws {Error} If file processing or Python service communication fails
 */
async function analyzeQuestionPaperFile(fileBuffer, mimeType, fileName) {
    try {
        // Validate inputs
        if (!fileBuffer || fileBuffer.length === 0) {
            throw new Error("File buffer is empty");
        }

        if (!mimeType) {
            throw new Error("MIME type is required");
        }

        // Create FormData for multipart/form-data request using the native submit API,
        // which is more reliable for multipart uploads than fetch() with form-data here.
        const FormData = require("form-data");
        const { URL } = require("url");
        const formData = new FormData();

        formData.append("file", fileBuffer, {
            filename: fileName,
            contentType: mimeType,
            knownLength: fileBuffer.length
        });

        const endpoint = new URL(`${PYTHON_SERVICE_URL}/api/analyze/file`);

        console.log(`[questionPaperAnalysisService] Sending file to Python service: ${endpoint.toString()}`);

        const response = await new Promise((resolve, reject) => {
            const req = formData.submit(endpoint, (err, res) => {
                if (err) {
                    return reject(err);
                }

                const chunks = [];
                res.on("data", (chunk) => chunks.push(chunk));
                res.on("end", () => {
                    const body = Buffer.concat(chunks).toString("utf8");
                    resolve({
                        statusCode: res.statusCode,
                        body
                    });
                });
            });

            const timeout = setTimeout(() => {
                req.destroy(new Error("Python service timeout (request took more than 30 seconds)"));
            }, REQUEST_TIMEOUT);

            req.on("error", (error) => {
                clearTimeout(timeout);
                reject(error);
            });

            req.on("close", () => clearTimeout(timeout));
        });

        // Check if response is ok
        if (response.statusCode >= 400) {
            let errorMessage = `Python service returned status ${response.statusCode}`;

            try {
                const errorData = JSON.parse(response.body);
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                }
            } catch (e) {
                // If response is not JSON, use default message
            }

            const error = new Error(errorMessage);
            error.status = response.statusCode;
            throw error;
        }

        // Parse response JSON
        let analysisResult;
        try {
            analysisResult = JSON.parse(response.body);
        } catch (error) {
            throw new Error("Invalid JSON response from Python service");
        }

        // Validate response structure
        if (!analysisResult.topics || !Array.isArray(analysisResult.topics)) {
            throw new Error("Invalid response format from Python service");
        }

        console.log(`[questionPaperAnalysisService] Analysis successful: ${analysisResult.totalQuestions} questions analyzed`);

        return analysisResult;
    } catch (error) {
        console.error(`[questionPaperAnalysisService] Error: ${error.message}`);

        if (error.message.includes("timeout")) {
            throw new Error("Python service timeout (request took more than 30 seconds)");
        }

        if (error.code === "ECONNREFUSED" || error.message.includes("ECONNREFUSED")) {
            throw new Error("Python service unavailable - connection refused");
        }

        throw error;
    }
}

module.exports = {
    analyzeQuestionPaperFile
};
