const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const resumeDirectory = path.join(process.cwd(), "uploads", "resumes");

fs.mkdirSync(resumeDirectory, { recursive: true });

// Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, resumeDirectory);
    },

    filename: (req, file, cb) => {
        const fileExtension = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomUUID()}${fileExtension}`);
    }
});

// File Filter (Only PDF, DOC, DOCX)
const fileFilter = (req, file, cb) => {
    const fileType = path.extname(file.originalname).toLowerCase();
    const isJobDescription = file.fieldname === "jobDescriptionFile";
    const allowedTypes = isJobDescription ? [".pdf", ".doc", ".docx", ".txt"] : [".pdf", ".doc", ".docx"];
    const allowedMimes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (isJobDescription && fileType === ".txt" && file.mimetype === "text/plain") {
        cb(null, true);
    } else if (allowedTypes.includes(fileType) && allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(isJobDescription ? "Only PDF, DOC, DOCX and TXT job descriptions are allowed." : "Only PDF, DOC and DOCX files are allowed."), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

const uploadMiddleware = {
    single: (fieldName) => (req, res, next) => {
        upload.single(fieldName)(req, res, (error) => {
            if (error) {
                const message = error.code === "LIMIT_FILE_SIZE"
                    ? "Maximum file size is 5MB."
                    : "Only PDF, DOC and DOCX files are allowed.";

                return res.status(400).json({
                    success: false,
                    message
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Resume file is required."
                });
            }

            next();
        });
    },
    optionalFields: (fields) => (req, res, next) => {
        upload.fields(fields)(req, res, (error) => {
            if (error) {
                const message = error.code === "LIMIT_FILE_SIZE"
                    ? "Maximum file size is 5MB."
                    : error.message || "Unable to upload the supplied files.";

                return res.status(400).json({
                    success: false,
                    message
                });
            }

            next();
        });
    },
};

module.exports = uploadMiddleware;
