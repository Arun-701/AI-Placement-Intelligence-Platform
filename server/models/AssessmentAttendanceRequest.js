const mongoose = require("mongoose");

const assessmentAttendanceRequestSchema = new mongoose.Schema(
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
    originalAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    originalAssignmentType: {
      type: String,
      enum: ["assessment", "set-assignment"],
      required: true,
    },
    setIndex: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Requested", "Assigned", "Completed", "Cancelled"],
      default: "Requested",
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledByRole: {
      type: String,
      enum: ["admin", "faculty"],
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

assessmentAttendanceRequestSchema.index(
  { student: 1, assessment: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);

module.exports = mongoose.model("AssessmentAttendanceRequest", assessmentAttendanceRequestSchema);
