const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    recipientType: {
      type: String,
      enum: ["student", "faculty", "admin"],
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "Assessment Assigned",
        "Assessment Published",
        "Assessment Reminder",
        "Assessment Submitted",
        "Assessment Result",
        "Resume Analysis Complete",
        "Career Recommendation Ready",
        "Roadmap Generated",
        "Profile Updated",
        "System Notification",
        "Admin Notification"
      ]
    },
    priority: {
      type: String,
      required: true,
      trim: true,
      enum: ["Low", "Medium", "High"]
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    referenceModel: {
      type: String,
      trim: true,
      default: ""
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
