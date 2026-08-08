const { generateAIResponse } = require("../services/geminiService");
const { successResponse, errorResponse } = require("../utils/response");

const chatWithAI = async (req, res) => {
    try {
        const { prompt } = req.body;

        if (typeof prompt !== "string" || prompt.trim() === "") {
            return errorResponse(res, { message: "Prompt is required.", status: 400 });
        }

        const responseText = await generateAIResponse(prompt.trim());

        return successResponse(res, { message: "AI response generated successfully", data: { response: responseText } });
    } catch (error) {
        console.error("AI chat controller error:", error.message);
        return errorResponse(res, { message: "Failed to generate AI response.", status: 500 });
    }
};

module.exports = {
    chatWithAI
};
