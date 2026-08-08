const fs = require("fs");
const path = require("path");

const requiredEnvVars = ["MONGO_URI", "JWT_SECRET", "GEMINI_API_KEY", "PORT", "UPLOAD_DIR"];

const validateEnv = () => {
  const missing = requiredEnvVars.filter((name) => !process.env[name] || process.env[name].trim() === "");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }

  if (Number.isNaN(Number(process.env.PORT)) || Number(process.env.PORT) <= 0) {
    throw new Error("PORT must be a valid positive number");
  }

  const uploadPath = path.resolve(process.env.UPLOAD_DIR);
  try {
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
  } catch (error) {
    throw new Error(`UPLOAD_DIR is invalid or cannot be created: ${uploadPath}`);
  }
};

module.exports = validateEnv;
