const multer = require("multer");
const path = require("path");

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, callback) => {
        const extension = path.extname(file.originalname || "").toLowerCase();
        const allowedExtensions = [".pdf", ".docx"];
        const allowedMimes = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ];

        if (allowedExtensions.includes(extension) && allowedMimes.includes(file.mimetype)) {
            return callback(null, true);
        }

        return callback(new Error("Only PDF and DOCX job description files are allowed."), false);
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadJobDescription = (fieldName) => (req, res, next) => {
    upload.single(fieldName)(req, res, (error) => {
        if (error) {
            const message = error.code === "LIMIT_FILE_SIZE"
                ? "Maximum job description file size is 5MB."
                : error.message || "Only PDF and DOCX job description files are allowed.";
            return res.status(400).json({ success: false, message });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Job description file is required." });
        }

        return next();
    });
};

module.exports = uploadJobDescription;
