const mongoose = require("mongoose");

const roadmapSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
            unique: true,
        },
        careerGoal: {
            type: String,
            trim: true,
            default: "",
        },
        summary: {
            type: String,
            trim: true,
            default: "",
        },
        skillGaps: {
            type: [
                {
                    domain: { type: String, trim: true, default: "General" },
                    title: { type: String, trim: true, default: "Skill Gap" },
                    severity: {
                        type: String,
                        enum: ["High", "Medium", "Low"],
                        default: "Medium",
                    },
                    priority: {
                        type: String,
                        enum: ["High", "Medium", "Low"],
                        default: "Medium",
                    },
                    evidence: { type: [{ type: String, trim: true }], default: [] },
                },
            ],
            default: [],
        },
        roadmapItems: {
            type: [
                {
                    title: { type: String, trim: true, required: true },
                    description: { type: String, trim: true, default: "" },
                    category: { type: String, trim: true, default: "Learning" },
                    priority: {
                        type: String,
                        enum: ["High", "Medium", "Low"],
                        default: "Medium",
                    },
                    estimatedTime: { type: String, trim: true, default: "3-5 days" },
                    status: {
                        type: String,
                        enum: ["Pending", "In Progress", "Completed"],
                        default: "Pending",
                    },
                    source: { type: String, trim: true, default: "RuleEngine" },
                    relatedSkills: { type: [{ type: String, trim: true }], default: [] },
                    week: { type: Number, default: 1 },
                },
            ],
            default: [],
        },
        recommendations: {
            courses: {
                type: [
                    {
                        title: { type: String, trim: true, required: true },
                        description: { type: String, trim: true, default: "" },
                        category: { type: String, trim: true, default: "Course" },
                        priority: {
                            type: String,
                            enum: ["High", "Medium", "Low"],
                            default: "Medium",
                        },
                        estimatedTime: { type: String, trim: true, default: "3-5 days" },
                        status: {
                            type: String,
                            enum: ["Pending", "In Progress", "Completed"],
                            default: "Pending",
                        },
                        source: { type: String, trim: true, default: "RuleEngine" },
                        link: { type: String, trim: true, default: "" },
                    },
                ],
                default: [],
            },
            practiceTopics: {
                type: [
                    {
                        title: { type: String, trim: true, required: true },
                        description: { type: String, trim: true, default: "" },
                        category: { type: String, trim: true, default: "Practice" },
                        priority: {
                            type: String,
                            enum: ["High", "Medium", "Low"],
                            default: "Medium",
                        },
                        estimatedTime: { type: String, trim: true, default: "2-3 days" },
                        status: {
                            type: String,
                            enum: ["Pending", "In Progress", "Completed"],
                            default: "Pending",
                        },
                        source: { type: String, trim: true, default: "RuleEngine" },
                    },
                ],
                default: [],
            },
            learningResources: {
                type: [
                    {
                        title: { type: String, trim: true, required: true },
                        description: { type: String, trim: true, default: "" },
                        category: { type: String, trim: true, default: "Resource" },
                        priority: {
                            type: String,
                            enum: ["High", "Medium", "Low"],
                            default: "Medium",
                        },
                        estimatedTime: { type: String, trim: true, default: "1-2 days" },
                        status: {
                            type: String,
                            enum: ["Pending", "In Progress", "Completed"],
                            default: "Pending",
                        },
                        source: { type: String, trim: true, default: "RuleEngine" },
                        link: { type: String, trim: true, default: "" },
                    },
                ],
                default: [],
            },
            miniProjects: {
                type: [
                    {
                        title: { type: String, trim: true, required: true },
                        description: { type: String, trim: true, default: "" },
                        category: { type: String, trim: true, default: "Project" },
                        priority: {
                            type: String,
                            enum: ["High", "Medium", "Low"],
                            default: "Medium",
                        },
                        estimatedTime: { type: String, trim: true, default: "1 week" },
                        status: {
                            type: String,
                            enum: ["Pending", "In Progress", "Completed"],
                            default: "Pending",
                        },
                        source: { type: String, trim: true, default: "RuleEngine" },
                    },
                ],
                default: [],
            },
        },
        progress: {
            completedItems: { type: Number, min: 0, default: 0 },
            inProgressItems: { type: Number, min: 0, default: 0 },
            pendingItems: { type: Number, min: 0, default: 0 },
            completionPercentage: { type: Number, min: 0, max: 100, default: 0 },
        },
        generatedAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Roadmap", roadmapSchema);
