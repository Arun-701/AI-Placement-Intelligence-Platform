const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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

    facultyId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
      default: "",
    },

    designation: {
      type: String,
      trim: true,
      default: "",
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

    assignedAssessments: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Assessment",
        },
      ],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    role: {
      type: String,
      enum: ["faculty"],
      default: "faculty",
    },

    passwordChangedAt: {
      type: Date,
      default: new Date(),
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Faculty", facultySchema);
