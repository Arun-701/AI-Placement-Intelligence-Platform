const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    assessmentType: {
      type: String,
      enum: ["Practice", "Internal", "Mock", "Placement", "Initial"],
      default: "Practice",
    },

    questions: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "QuestionBank",
        },
      ],
      default: [],
    },

    assignedStudents: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
        },
      ],
      default: [],
    },

    assignedFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
    },

    totalMarks: {
      type: Number,
      min: 0,
      default: 0,
    },

    duration: {
      type: Number,
      min: 1,
      default: 60,
    },

    passingMarks: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: function (value) {
          return value <= this.totalMarks;
        },
        message: "Passing marks cannot exceed total marks",
      },
    },

    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
      validate: {
        validator: function (value) {
          return !value || !this.startDate || value >= this.startDate;
        },
        message: "End date must be on or after the start date",
      },
    },

    status: {
      type: String,
      enum: ["Draft", "Published", "Completed"],
      default: "Draft",
    },

    isInitialAssessment: {
      type: Boolean,
      default: false,
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

module.exports = mongoose.model("Assessment", assessmentSchema);
