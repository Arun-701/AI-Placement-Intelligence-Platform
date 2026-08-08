const mongoose = require("mongoose");

const questionBankSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    topic: {
      type: String,
      required: true,
      trim: true,
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },

    marks: {
      type: Number,
      min: 1,
      default: 1,
    },

    question: {
      type: String,
      required: true,
      trim: true,
    },

    options: {
      type: [{ type: String, trim: true }],
      default: [],
      validate: {
        validator: function (options) {
          if (this.questionType !== "MCQ") {
            return options.length === 0 || options.length === 4;
          }

          return options.length === 4 && options.every((option) => option.length > 0);
        },
        message: "MCQ questions must include exactly four non-empty options",
      },
    },

    correctAnswer: {
      type: String,
      trim: true,
      required: function () {
        return this.questionType === "MCQ";
      },
      default: "",
    },

    explanation: {
      type: String,
      trim: true,
      default: "",
    },

    questionType: {
      type: String,
      enum: ["MCQ", "Coding", "Aptitude", "Technical", "HR"],
      default: "MCQ",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("QuestionBank", questionBankSchema);
