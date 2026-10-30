const Student = require("../models/Student");
const Roadmap = require("../models/Roadmap");
const AssessmentResult = require("../models/AssessmentResult");
const { getMissingProfileFields } = require("../validators/studentProfileValidator");

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
    .select("fullName email phone gender dateOfBirth department year section cgpa college skills interests linkedin github leetcode hackerrank codechef codeforces resume resumeAnalysis resumeScore lastResumeAnalysisDate placementReadinessScore readinessProfile codingProfile isVerified isActive assessmentsCompleted profileCompleted initialAssessmentCompleted")
    .lean();
  if (!student) {
    throw new Error("Student not found");
  }

  const completion = calculateProfileCompletion(student);
  const storedResumeScore = toOptionalScore(student.resumeScore);
  const analyzedResumeScore = toOptionalScore(student.resumeAnalysis?.resumeScore ?? student.resumeAnalysis?.overallScore);
  return {
    student: {
      fullName: student.fullName || "",
      email: student.email,
      phone: student.phone || "",
      gender: student.gender || "",
      dateOfBirth: student.dateOfBirth || null,
      department: student.department || "",
      year: student.year || null,
      cgpa: student.cgpa === undefined ? null : student.cgpa,
      college: student.college || "",
      skills: student.skills || [],
      interests: student.interests || [],
      linkedin: student.linkedin || "",
      github: student.github || "",
      leetcode: student.leetcode || "",
      hackerrank: student.hackerrank || "",
      codechef: student.codechef || "",
      codeforces: student.codeforces || "",
      codingProfile: student.codingProfile || { score: 0 },
      resumeAnalysis: student.resumeAnalysis || null,
      resumeScore: student.resume ? (storedResumeScore ?? analyzedResumeScore) : null,
      lastResumeAnalysisDate: student.lastResumeAnalysisDate || null,
      placementReadinessScore: student.placementReadinessScore ?? null,
      readinessProfile: student.readinessProfile || null,
      resume: student.resume || "",
      emailVerified: student.isVerified,
      accountActive: student.isActive,
      assessmentsCompleted: student.assessmentsCompleted || 0,
      initialAssessmentCompleted: student.initialAssessmentCompleted || false,
      profileCompleted: completion.profileCompleted,
      profileCompletion: completion.percentage
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
  const hasCalculatedReadiness = Boolean(readinessProfile?.lastCalculatedAt);
  const resumeAnalysis = profile.student.resumeAnalysis;
  const resumeScore = toOptionalScore(resumeAnalysis?.resumeScore);
  const storedResumeScore = profile.student.resume ? resumeScore : null;
  const calculatedReadinessScore = hasCalculatedReadiness ? toOptionalScore(readinessProfile.score) : null;
  const storedReadinessScore = toOptionalScore(profile.student.placementReadinessScore);
  const placementReadinessScore = calculatedReadinessScore ?? (storedReadinessScore > 0 ? storedReadinessScore : null);

  return {
   profileCompletion: profile.student.profileCompletion,
    resumeUploaded: Boolean(profile.student.resume),
    emailVerified: profile.student.emailVerified,
    codingProfilesConnected: Boolean(profile.student.github || profile.student.leetcode || profile.student.codechef || profile.student.hackerrank || profile.student.codeforces),
    assessmentsCompleted,
    codingScore: totalProblemsSolved,
    codingSkillScore,
    resumeScore: storedResumeScore,
    placementReadinessScore,
    readinessSummary: hasCalculatedReadiness
      ? (readinessProfile.explanation || readinessProfile.level || null)
      : null,
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

  PROFILE_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      student[field] = updates[field];
    }
  });

  const completion = calculateProfileCompletion(student);
  student.profileCompleted = completion.profileCompleted;
  await student.save();

  return {
    student,
    profileCompletion: completion.percentage,
    missingFields: completion.missingFields
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
  calculateProfileCompletion,
  getStudentProfile,
  getStudentDashboard,
  updateStudentProfile,
  getProfileCompletionStatus
};
