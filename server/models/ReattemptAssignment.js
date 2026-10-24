const mongoose = require("mongoose");

const reattemptAssignmentSchema = new mongoose.Schema(
  {
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
    },
    students: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
      required: true,
      validate: [(students) => students.length > 0, "At least one student is required"],
    },
    requests: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "AssessmentAttendanceRequest" }],
      required: true,
    },
    setIndex: {
      type: Number,
      min: 0,
      required: true,
    },
    departments: {
      type: [String],
      default: [],
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

reattemptAssignmentSchema.index(
  { assessment: 1, students: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);

module.exports = mongoose.model("ReattemptAssignment", reattemptAssignmentSchema);
