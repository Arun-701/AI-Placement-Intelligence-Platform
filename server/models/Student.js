const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    fullName: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    gender: {
  type: String,
  trim: true,
  lowercase: true,
  enum: ["male", "female", "other", "prefer not to say", "non-binary"],
  default: undefined,
},

    dateOfBirth: {
      type: Date,
      default: null,
    },

    college: {
      type: String,
      trim: true,
      default: "",
    },

    interests: {
      type: [{ type: String, trim: true }],
      default: [],
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    studentId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    department: {
      type: String,
      required: true,
      trim: true,
    },

    year: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },

    section: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    github: {
      type: String,
      trim: true,
      default: "",
    },

    leetcode: {
      type: String,
      trim: true,
      default: "",
    },

    codechef: {
      type: String,
      trim: true,
      default: "",
    },

    hackerrank: {
      type: String,
      trim: true,
      default: "",
    },

    linkedin: {
      type: String,
      trim: true,
      default: "",
    },

    placementReadinessScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    readinessProfile: {
      score: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      level: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Low",
      },
      explanation: {
        type: String,
        trim: true,
        default: "",
      },
      recommendedActions: {
        type: [{ type: String, trim: true }],
        default: [],
      },
      lastCalculatedAt: {
        type: Date,
        default: null,
      },
    },

    codingProfile: {
      score: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      level: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Low",
      },
      updatedAt: {
        type: Date,
        default: null,
      },
      explanation: {
        type: String,
        trim: true,
        default: "",
      },
      totalProblemsSolved: {
        type: Number,
        min: 0,
        default: 0,
      },
      easySolved: {
        type: Number,
        min: 0,
        default: 0,
      },
      mediumSolved: {
        type: Number,
        min: 0,
        default: 0,
      },
      hardSolved: {
        type: Number,
        min: 0,
        default: 0,
      },
      contestsParticipated: {
        type: Number,
        min: 0,
        default: 0,
      },
      topicAnalysis: {
        type: [{
          topic: { type: String, trim: true, default: "General" },
          solved: { type: Number, min: 0, default: 0 },
          accuracy: { type: Number, min: 0, max: 100, default: 0 },
        }],
        default: [],
      },
      platforms: {
        type: [{
          platform: { type: String, trim: true, default: "Unknown" },
          profileUrl: { type: String, trim: true, default: "" },
          totalSolved: { type: Number, min: 0, default: 0 },
          easySolved: { type: Number, min: 0, default: 0 },
          mediumSolved: { type: Number, min: 0, default: 0 },
          hardSolved: { type: Number, min: 0, default: 0 },
          contestsParticipated: { type: Number, min: 0, default: 0 },
        }],
        default: [],
      },
    },

    strengths: {
      type: [{ type: String, trim: true }],
      default: [],
    },

    weaknesses: {
      type: [{ type: String, trim: true }],
      default: [],
    },

    assessmentsCompleted: {
      type: Number,
      min: 0,
      default: 0,
    },

    tasksCompleted: {
      type: Number,
      min: 0,
      default: 0,
    },

    currentStreak: {
      type: Number,
      min: 0,
      default: 0,
    },

    firstLoginCompleted: {
      type: Boolean,
      default: false,
    },

    currentAttempt: {
      assessmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Assessment",
        default: null,
      },
      startedAt: {
        type: Date,
        default: null,
      },
      dueAt: {
        type: Date,
        default: null,
      },
      status: {
        type: String,
        enum: ["pending", "in-progress", "completed", "expired"],
        default: "pending",
      }
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    skills: [
      {
        type: String,
        trim: true,
      },
    ],

    cgpa: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },

    resume: {
      type: String,
      trim: true,
      default: "",
    },

    resumeAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    profileCompleted: {
      type: Boolean,
      default: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationRequired: {
      type: Boolean,
      default: false,
    },

    emailVerificationOtpHash: {
      type: String,
      default: "",
    },

    emailVerificationOtpExpiresAt: {
      type: Date,
      default: null,
    },

    emailVerificationOtpAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    emailVerificationLastSentAt: {
      type: Date,
      default: null,
    },

    resetPasswordToken: {
      type: String,
      trim: true,
      default: "",
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    initialAssessmentCompleted: {
      type: Boolean,
      default: false,
    },

    initialAssessmentResult: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssessmentResult",
      default: null,
    },

    baselineAssessment: {
      assessmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Assessment",
        default: null,
      },
      resultId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AssessmentResult",
        default: null,
      },
      score: {
        type: Number,
        default: 0,
      },
      totalMarks: {
        type: Number,
        default: 0,
      },
      percentage: {
        type: Number,
        default: 0,
      },
      submittedAt: {
        type: Date,
        default: null,
      },
      strengths: {
        type: [{ type: String, trim: true }],
        default: [],
      },
      weaknesses: {
        type: [{ type: String, trim: true }],
        default: [],
      },
      topicAnalysis: {
        type: [{
          topic: { type: String, trim: true, default: "General" },
          correctAnswers: { type: Number, default: 0 },
          totalQuestions: { type: Number, default: 0 },
          accuracy: { type: Number, default: 0 },
        }],
        default: [],
      },
    },

    role: {
      type: String,
      enum: ["student"],
      default: "student",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Student", studentSchema);
