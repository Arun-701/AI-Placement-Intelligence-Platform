const dotenv = require("dotenv");

dotenv.config();

const aiProviders = {
    primary: {
        name: "Gemini",
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 20000)
    },
    fallback: {
        name: "Kimi (TokenRouter)",
        baseUrl: process.env.TOKENROUTER_BASE_URL || "https://api.tokenrouter.com/v1",
        apiKey: process.env.TOKENROUTER_API_KEY,
        model: process.env.TOKENROUTER_MODEL || "moonshotai/kimi-k3-free",
        timeoutMs: Number(process.env.TOKENROUTER_TIMEOUT_MS || 120000),
        retries: 2
    },
    nvidia: {
        name: "NVIDIA",
        baseUrl: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
        apiKey: process.env.NVIDIA_API_KEY,
        model: process.env.NVIDIA_MODEL || "riva-translate-4b-instruct-v2",
        timeoutMs: Number(process.env.NVIDIA_TIMEOUT_MS || 20000),
        retries: 1
    }
};

module.exports = {
    aiProviders
};
