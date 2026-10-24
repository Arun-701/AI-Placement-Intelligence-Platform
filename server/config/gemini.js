const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY?.trim();
const geminiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;
const geminiModelName = "gemini-2.0-flash";
const geminiModel = geminiClient ? geminiClient.models : null;

module.exports = {
    geminiClient,
    geminiModel,
    geminiModelName
};
