const path = require("path");
const dotenv = require("dotenv");

// Load environment variables before importing modules that read them at initialization.
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const studentAssessmentRoutes = require("./routes/studentAssessmentRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const facultyAssessmentRoutes = require("./routes/facultyAssessmentRoutes");
const facultyResultRoutes = require("./routes/facultyResultRoutes");
const questionBankRoutes = require("./routes/questionBankRoutes");
const assessmentRoutes = require("./routes/assessmentRoutes");
const assessmentResultRoutes = require("./routes/assessmentResultRoutes");
const aiRoutes = require("./routes/aiRoutes");
const resumeAIRoutes = require("./routes/resumeAIRoutes");
const resumeJDRoutes = require("./routes/resumeJDRoutes");
const careerRecommendationRoutes = require("./routes/careerRecommendationRoutes");
const questionPaperAnalysisRoutes = require("./routes/questionPaperAnalysisRoutes");
const roadmapRoutes = require("./routes/roadmapRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminAssessmentRoutes = require("./routes/adminAssessmentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const { authLimiter, aiLimiter, adminLimiter, generalLimiter } = require("./middleware/rateLimit");
const { requestLogger, logger } = require("./middleware/logger");
const connectDB = require("./config/database");
const validateEnv = require("./config/validateEnv");

validateEnv();
connectDB();

const app = express();

app.use(helmet());
app.use(compression());
app.use(cors({ origin: true, optionsSuccessStatus: 200 }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(requestLogger);

// Debug logging for all requests
app.use((req, res, next) => {
    console.log(`[DEBUG] ${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);
console.log("[INIT] Registered aiRoutes");
app.use("/api/ai", aiLimiter, resumeAIRoutes);
console.log("[INIT] Registered resumeAIRoutes");
app.use("/api/ai", aiLimiter, resumeJDRoutes);
console.log("[INIT] Registered resumeJDRoutes (includes POST /analyze-resume-jd)");
app.use("/api/ai", aiLimiter, careerRecommendationRoutes);
console.log("[INIT] Registered careerRecommendationRoutes");
app.use("/api/ai", aiLimiter, questionPaperAnalysisRoutes);
console.log("[INIT] Registered questionPaperAnalysisRoutes (includes POST /question-paper/analyze)");
app.use("/api/admin", adminLimiter, adminRoutes);
app.use("/api/admin/assessments", adminAssessmentRoutes);
app.use(generalLimiter);
app.use("/api/student", studentRoutes);
app.use("/api/assessment", studentAssessmentRoutes);
app.use("/api/faculty/assessments", facultyAssessmentRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/faculty/results", facultyResultRoutes);
app.use("/api/question-bank", questionBankRoutes);
app.use("/api/assessment", assessmentRoutes);
app.use("/api/assessment-result", assessmentResultRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api", roadmapRoutes);
app.use("/api", dashboardRoutes);

const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});
