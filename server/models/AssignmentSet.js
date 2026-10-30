const mongoose = require("mongoose");

const assignmentSetSchema = new mongoose.Schema(
  {
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
    },

    department: {
      type: String,
      required: true,
      trim: true,
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

    deadline: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return !value || value > new Date();
        },
        message: "Deadline must be a future date",
      },
    },

    status: {
      type: String,
      enum: ["Draft", "Published", "Expired", "Completed"],
      default: "Draft",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdAt: {
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

// Index for quick lookups
assignmentSetSchema.index({ assessment: 1, department: 1 });
assignmentSetSchema.index({ assessment: 1, isActive: 1 });

module.exports = mongoose.model("AssignmentSet", assignmentSetSchema);
