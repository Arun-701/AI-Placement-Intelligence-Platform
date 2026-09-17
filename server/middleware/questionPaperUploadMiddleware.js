const multer = require("multer");
const path = require("path");

const allowedExtensions = [".pdf"];
const allowedMimeTypes = ["application/pdf"];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(extension) || !allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error("Only PDF files are allowed for question paper analysis."));
        }
        cb(null, true);
    }
});

module.exports = {
    single: (fieldName) => (req, res, next) => {
        upload.single(fieldName)(req, res, (error) => {
            if (error) {
                const message = error.code === "LIMIT_FILE_SIZE"
                    ? "Maximum file size is 5MB."
                    : error.message || "Only PDF files are allowed for question paper analysis.";
                return res.status(400).json({
                    success: false,
                    message
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Question paper file is required."
                });
            }

            next();
        });
    }
};
