const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    targetType: {
      type: String,
      enum: ["ALL_STUDENTS", "ALL_FACULTY", "ALL_USERS", "DEPARTMENT"],
      required: true,
    },
    departments: { type: [{ type: String, trim: true }], default: [] },
    // Legacy single-department field retained for existing announcements.
    department: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);
