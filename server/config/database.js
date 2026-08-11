const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Assessment = require("../models/Assessment");
const QuestionBank = require("../models/QuestionBank");

const loadEnvironment = () => {
    const rootEnvPath = path.resolve(__dirname, "../.env");
    const localEnvPath = path.resolve(__dirname, ".env");

    if (fs.existsSync(rootEnvPath)) {
        require("dotenv").config({ path: rootEnvPath });
        console.log(`Loaded environment from ${rootEnvPath}`);
        return;
    }

    if (fs.existsSync(localEnvPath)) {
        require("dotenv").config({ path: localEnvPath });
        console.log(`Loaded environment from ${localEnvPath}`);
        return;
    }

    console.warn("No .env file found for database configuration.");
};

loadEnvironment();

const ensureInitialAssessmentExists = async () => {
    const existingInitial = await Assessment.findOne({
        isInitialAssessment: true,
        isActive: true,
        status: "Published"
    });

    if (existingInitial) {
        return;
    }

    const questions = await QuestionBank.find({ isActive: true }).limit(10);

    if (!questions.length) {
        console.warn("⚠️ No active question bank entries found. Default initial assessment was not created.");
        return;
    }

    const totalMarks = questions.reduce((sum, question) => sum + (Number(question.marks) || 0), 0);
    const initialAssessmentPayload = {
        title: "Initial Onboarding Assessment",
        description: "This default initial assessment helps students complete onboarding and begin their placement readiness journey.",
        assessmentType: "Initial",
        isInitialAssessment: true,
        questions: questions.map((question) => question._id),
        totalMarks,
        duration: 30,
        passingMarks: 0,
        status: "Published",
        isActive: true
    };

    await Assessment.create(initialAssessmentPayload);
    console.log("✅ Default initial assessment created.");
};

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("✅ MongoDB Connected Successfully");
        await ensureInitialAssessmentExists();
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;