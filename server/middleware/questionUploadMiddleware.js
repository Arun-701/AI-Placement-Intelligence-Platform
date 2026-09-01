const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const uploadDirectory = path.join(process.cwd(), "tmp", "question-uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedExtensions = [".pdf", ".doc", ".docx"];
const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const upload = multer({
    storage: multer.diskStorage({
        destination: uploadDirectory,
        filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(extension) || !allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error("Only PDF, DOC and DOCX files are allowed."));
        }
        cb(null, true);
    }
});

module.exports = (req, res, next) => upload.single("file")(req, res, (error) => {
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.code === "LIMIT_FILE_SIZE" ? "Maximum file size is 5MB." : error.message
        });
    }
    if (!req.file) return res.status(400).json({ success: false, message: "Question file is required." });
    next();
});