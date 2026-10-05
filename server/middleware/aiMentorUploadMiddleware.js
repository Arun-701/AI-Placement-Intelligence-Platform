const multer = require("multer");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Create temp directory for uploads
const tempDir = path.join(os.tmpdir(), "ai-mentor-uploads");
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const allowedExtensions = [".pdf", ".docx", ".doc", ".txt"];
const allowedMimeTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain"
];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        cb(null, `${timestamp}-${randomSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    },
    fileFilter: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(extension) || !allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error("Only PDF, DOCX, and TXT files are allowed."));
        }
        cb(null, true);
    }
});

module.exports = {
    single: (fieldName) => (req, res, next) => {
        upload.single(fieldName)(req, res, (error) => {
            if (error) {
                const message = error.code === "LIMIT_FILE_SIZE"
                    ? "Maximum file size is 10MB."
                    : error.message || "Only PDF, DOCX, and TXT files are allowed.";
                return res.status(400).json({
                    success: false,
                    error: message
                });
            }

            // File is optional for text input
            next();
        });
    }
};
