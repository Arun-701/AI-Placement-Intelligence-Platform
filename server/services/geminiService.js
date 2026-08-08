const { geminiModel, geminiModelName } = require("../config/gemini");

const extractTextFromResponse = (response) => {
    if (typeof response?.text === "string" && response.text.trim()) {
        return response.text.trim();
    }

    const candidates = response?.candidates || [];
    const textParts = candidates
        .map((candidate) =>
            candidate?.content?.parts
                ?.map((part) => part?.text || "")
                .join("") || ""
        )
        .filter(Boolean);

    return textParts.join("\n").trim();
};

const generateAIResponse = async (prompt) => {
    if (!geminiModel) {
        throw new Error("Gemini client is not initialized. Please set GEMINI_API_KEY.");
    }

    const normalizedPrompt = prompt?.trim();

    if (!normalizedPrompt) {
        throw new Error("Prompt cannot be empty.");
    }

    try {
        const response = await geminiModel.generateContent({
            model: geminiModelName,
            contents: [
                {
                    role: "user",
                    parts: [{ text: normalizedPrompt }]
                }
            ]
        });

        const text = extractTextFromResponse(response);

        if (!text) {
            throw new Error("No response text returned by Gemini.");
        }

        return text;
    } catch (error) {
        console.error("Gemini service error:", error.message);
        throw new Error("Unable to generate AI response.");
    }
};

module.exports = {
    generateAIResponse
};
