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

    resetPasswordToken: {
      type: String,
      trim: true,
      default: "",
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },

    // Undefined means a pre-verification-feature account and remains allowed to sign in.
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

    // Self-registered faculty must be approved explicitly.
    approvalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED"],
      default: "PENDING",
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
