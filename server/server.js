const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
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
const careerRecommendationRoutes = require("./routes/careerRecommendationRoutes");
const roadmapRoutes = require("./routes/roadmapRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const { authLimiter, aiLimiter, adminLimiter, generalLimiter } = require("./middleware/rateLimit");
const { requestLogger, logger } = require("./middleware/logger");
const connectDB = require("./config/database");
const validateEnv = require("./config/validateEnv");

// Load backend configuration independently of the directory used to launch Node.
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config();

validateEnv();
connectDB();

const app = express();

app.use(helmet());
app.use(compression());
app.use(cors({ origin: true, optionsSuccessStatus: 200 }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(requestLogger);

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);
app.use("/api/ai", aiLimiter, resumeAIRoutes);
app.use("/api/ai", aiLimiter, careerRecommendationRoutes);
app.use("/api/admin", adminLimiter, adminRoutes);
app.use(generalLimiter);
app.use("/api/student", studentRoutes);
app.use("/api/assessment", studentAssessmentRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/faculty/assessments", facultyAssessmentRoutes);
app.use("/api/faculty/results", facultyResultRoutes);
app.use("/api/question-bank", questionBankRoutes);
app.use("/api/assessment", assessmentRoutes);
app.use("/api/assessment-result", assessmentResultRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api", roadmapRoutes);
app.use("/api", dashboardRoutes);

const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});
