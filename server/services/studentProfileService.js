const Student = require("../models/Student");
const Roadmap = require("../models/Roadmap");
const AssessmentResult = require("../models/AssessmentResult");
const { getMissingProfileFields } = require("../validators/studentProfileValidator");
const { calculatePlacementReadinessScore, updateStudentReadinessProfile } = require("./readinessService");

const toOptionalScore = (value) => {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
};

// Only the visible/profile onboarding fields are required for completion
const PROFILE_FIELDS = [
  "fullName",
  "phone",
  "college",
  "section",
  "github",
  "linkedin",
  "skills",
  "cgpa"
];

const PROFILE_UPDATE_FIELDS = [
  ...PROFILE_FIELDS,
  "studentId",
  "department",
  "degree",
  "year",
  "semester",
  "graduationYear",
  "portfolio"
];

const PROFILE_COMPLETENESS_FIELDS = [
  ["fullName", "Full name"],
  ["emailVerified", "Verified email"],
  ["phone", "Phone number"],
  ["studentId", "Registration number"],
  ["college", "College"],
  ["department", "Department"],
  ["degree", "Degree"],
  ["year", "Current year"],
  ["semester", "Current semester"],
  ["section", "Section"],
  ["cgpa", "CGPA"],
  ["graduationYear", "Graduation year"],
  ["skills", "Skills"],
  ["github", "GitHub profile"],
  ["linkedin", "LinkedIn profile"],
  ["portfolio", "Portfolio URL"],
  ["resumeUploaded", "Resume"]
];

const calculateProfileCompleteness = (student) => {
  const missingFields = PROFILE_COMPLETENESS_FIELDS
    .filter(([field]) => {
      const value = field === "emailVerified"
        ? student.isVerified
        : field === "resumeUploaded"
          ? Boolean(student.resume)
          : student[field];
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === "string") return value.trim() === "";
      return value === null || value === undefined || value === false;
    })
    .map(([, label]) => label);

  return {
    percentage: Math.round(((PROFILE_COMPLETENESS_FIELDS.length - missingFields.length) / PROFILE_COMPLETENESS_FIELDS.length) * 100),
    missingFields
  };
};

const calculateProfileCompletion = (student) => {
  const missingFields = PROFILE_FIELDS.filter((field) => {
    const value = student[field];
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'string') return value.trim() === '';
    return value === null || value === undefined;
  });
  const completedFields = PROFILE_FIELDS.length - missingFields.length;
  const percentage = PROFILE_FIELDS.length === 0 ? 100 : Math.round((completedFields / PROFILE_FIELDS.length) * 100);

  return {
    percentage,
    missingFields,
    profileCompleted: percentage === 100
  };
};

const getStudentProfile = async (studentId) => {
  const student = await Student.findById(studentId)
    .select("fullName email phone studentId gender dateOfBirth department degree year semester section graduationYear cgpa college skills interests linkedin github portfolio leetcode hackerrank codechef codeforces resume resumeOriginalName resumeSize resumeAnalysis resumeScore lastResumeAnalysisDate placementReadinessScore readinessProfile codingProfile isVerified isActive assessmentsCompleted profileCompleted initialAssessmentCompleted")
    .lean();
  if (!student) {
    throw new Error("Student not found");
  }

  const completion = calculateProfileCompletion(student);
  const profileCompleteness = calculateProfileCompleteness(student);
  const readiness = await calculatePlacementReadinessScore(student);
  const readinessProfile = {
    score: readiness.score,
    level: readiness.level,
    explanation: readiness.explanation,
    recommendedActions: readiness.recommendedActions,
    lastCalculatedAt: new Date(),
    breakdown: readiness.breakdown,
    factors: readiness.factors
  };
  return {
    student: {
      fullName: student.fullName || "",
      email: student.email,
      phone: student.phone || "",
      studentId: student.studentId || "",
      gender: student.gender || "",
      dateOfBirth: student.dateOfBirth || null,
      department: student.department || "",
      degree: student.degree || "",
      year: student.year || null,
      semester: student.semester ?? null,
      graduationYear: student.graduationYear ?? null,
      cgpa: student.cgpa === undefined ? null : student.cgpa,
      college: student.college || "",
      skills: student.skills || [],
      interests: student.interests || [],
      linkedin: student.linkedin || "",
      github: student.github || "",
      portfolio: student.portfolio || "",
      leetcode: student.leetcode || "",
      hackerrank: student.hackerrank || "",
      codechef: student.codechef || "",
      codeforces: student.codeforces || "",
      codingProfile: student.codingProfile || { score: 0 },
      resumeAnalysis: student.resumeAnalysis || null,
      resumeScore: readiness.breakdown.resume.score,
      lastResumeAnalysisDate: student.lastResumeAnalysisDate || null,
      placementReadinessScore: readiness.score,
      readinessProfile,
      resume: student.resume || "",
      resumeFileName: student.resumeOriginalName || "",
      resumeSize: Number(student.resumeSize) || 0,
      emailVerified: student.isVerified,
      accountActive: student.isActive,
      assessmentsCompleted: student.assessmentsCompleted || 0,
      initialAssessmentCompleted: student.initialAssessmentCompleted || false,
      profileCompleted: completion.profileCompleted,
      profileCompletion: completion.percentage,
      profileCompleteness
    }
  };
};

const getStudentDashboard = async (studentId) => {
  const profile = await getStudentProfile(studentId);
  const [roadmap, assessmentsCompleted] = await Promise.all([
    Roadmap.findOne({ student: studentId }).lean(),
    AssessmentResult.countDocuments({ student: studentId, completed: true })
  ]);
  const totalProblemsSolved = profile.student.codingProfile?.totalProblemsSolved || 0;
  const codingProfile = profile.student.codingProfile;
  const countableCodingPlatforms = new Set(["leetcode", "codeforces", "codechef"]);
  const codingCountFields = ["totalSolved", "easySolved", "mediumSolved", "hardSolved"];
  const hasVerifiedCodingStats = (codingProfile?.platforms || []).some((platform) =>
    platform.profileVerified === true &&
    countableCodingPlatforms.has(String(platform.platform || "").toLowerCase()) &&
    codingCountFields.some((field) => toOptionalScore(platform[field]) !== null)
  );
  const storedCodingScore = toOptionalScore(codingProfile?.score);
  const codingSkillScore = storedCodingScore !== null &&
    (storedCodingScore > 0 || hasVerifiedCodingStats)
    ? storedCodingScore
    : null;
  const readinessProfile = profile.student.readinessProfile;
  const placementReadinessScore = profile.student.placementReadinessScore;

  return {
   profileCompletion: profile.student.profileCompletion,
    resumeUploaded: Boolean(profile.student.resume),
    emailVerified: profile.student.emailVerified,
    codingProfilesConnected: Boolean(profile.student.github || profile.student.leetcode || profile.student.codechef || profile.student.hackerrank || profile.student.codeforces),
    assessmentsCompleted,
    codingScore: totalProblemsSolved,
    codingSkillScore,
    resumeScore: profile.student.resumeScore,
    placementReadinessScore,
    readinessSummary: readinessProfile.explanation || readinessProfile.level || null,
    readinessProfile,
    kpiCards: {
      codingScore: totalProblemsSolved,
      codingSkillScore,
      assessmentsCompleted
    },
    roadmapAvailable: Boolean(roadmap)
  };
};

const updateStudentProfile = async (studentId, updates) => {
  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error("Student not found");
  }

  if (updates.studentId && updates.studentId !== student.studentId) {
    const existingStudent = await Student.exists({
      studentId: updates.studentId,
      _id: { $ne: student._id }
    });
    if (existingStudent) {
      const error = new Error("That registration number is already in use.");
      error.code = "DUPLICATE_STUDENT_ID";
      throw error;
    }
  }

  PROFILE_UPDATE_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      if (field === "studentId" && updates[field] === null) {
        student[field] = undefined;
      } else {
        student[field] = updates[field];
      }
    }
  });

  const completion = calculateProfileCompletion(student);
  student.profileCompleted = completion.profileCompleted;
  await student.save();
  await updateStudentReadinessProfile(studentId);
  const profile = await getStudentProfile(studentId);

  return {
    student: profile.student,
    profileCompletion: completion.percentage,
    missingFields: completion.missingFields,
    profileCompleteness: profile.student.profileCompleteness
  };
};

const getProfileCompletionStatus = async (studentId) => {
  const student = await Student.findById(studentId).lean();
  if (!student) {
    throw new Error("Student not found");
  }

  return calculateProfileCompletion(student);
};

module.exports = {
  PROFILE_FIELDS,
  PROFILE_UPDATE_FIELDS,
  calculateProfileCompleteness,
  calculateProfileCompletion,
  getStudentProfile,
  getStudentDashboard,
  updateStudentProfile,
  getProfileCompletionStatus
};
