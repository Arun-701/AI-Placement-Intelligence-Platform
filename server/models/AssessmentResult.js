const mongoose = require("mongoose");

const assessmentResultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
    },

    score: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: function (value) {
          return value <= this.totalMarks;
        },
        message: "Score cannot exceed total marks",
      },
    },

    totalMarks: {
      type: Number,
      min: 0,
      default: 0,
    },

    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    answers: {
      type: [
        {
          question: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QuestionBank",
            required: true,
          },
          selectedAnswer: {
            type: String,
            trim: true,
            default: "",
          },
          isCorrect: {
            type: Boolean,
            default: false,
          },
          marksObtained: {
            type: Number,
            min: 0,
            default: 0,
          },
        },
      ],
      default: [],
    },

    strengths: {
      type: [{ type: String, trim: true }],
      default: [],
    },

    weaknesses: {
      type: [{ type: String, trim: true }],
      default: [],
    },

    recommendations: {
      type: [{ type: String, trim: true }],
      default: [],
    },

    topicAnalysis: {
      type: [{
        topic: { type: String, trim: true, default: "General" },
        correctAnswers: { type: Number, min: 0, default: 0 },
        totalQuestions: { type: Number, min: 0, default: 0 },
        score: { type: Number, min: 0, default: 0 },
        totalMarks: { type: Number, min: 0, default: 0 },
        accuracy: { type: Number, min: 0, max: 100, default: 0 },
      }],
      default: [],
    },

    submittedAt: {
      type: Date,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    feedback: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AssessmentResult", assessmentResultSchema);
