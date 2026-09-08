const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const materialDirectory = path.join(process.cwd(), "uploads", "assessment-materials");
fs.mkdirSync(materialDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: materialDirectory,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = [".pdf", ".docx"];
  cb(allowed.includes(ext) ? null : new Error("Only PDF and DOCX files are allowed."), allowed.includes(ext));
}});

module.exports = (req, res, next) => upload.single("material")(req, res, (error) => {
  if (error) return res.status(400).json({ success: false, message: error.code === "LIMIT_FILE_SIZE" ? "Maximum file size is 5MB." : error.message });
  if (!req.file) return res.status(400).json({ success: false, message: "A PDF or DOCX question paper is required." });
  next();
});
