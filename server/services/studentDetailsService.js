const mongoose = require("mongoose");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const Roadmap = require("../models/Roadmap");
const AssessmentResult = require("../models/AssessmentResult");
const { calculateProfileCompleteness } = require("./studentProfileService");
const { calculatePlacementReadinessScore } = require("./readinessService");

const nullableNumber = (value) => value === null || value === undefined || value === "" || !Number.isFinite(Number(value))
  ? null
  : Number(value);
const stringArray = (value) => Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
const countMetric = (value) => {
  if (Array.isArray(value)) return value.length;
  return nullableNumber(value);
};

const getStudentDetails = async (studentId, { role, userId }) => {
  if (!mongoose.isValidObjectId(studentId)) {
    const error = new Error("Invalid student ID.");
    error.status = 400;
    throw error;
  }

  if (role === "faculty") {
    const faculty = await Faculty.findById(userId).select("assignedStudents").lean();
    const hasAssignment = (faculty?.assignedStudents || []).some((id) => id.toString() === studentId);
    if (!faculty || !hasAssignment) {
      const error = new Error("Student not found.");
      error.status = 404;
      throw error;
    }
  } else if (role !== "admin") {
    const error = new Error("You are not authorized to view student details.");
    error.status = 403;
    throw error;
  }

  const student = await Student.findById(studentId).select(
    "name fullName email isVerified phone studentId department college degree year semester section cgpa graduationYear skills github linkedin portfolio codingProfile leetcode codechef hackerrank codeforces resume resumeOriginalName resumeMimeType resumeSize resumeScore resumeAnalysis resumeJDAnalysis readinessProfile placementReadinessScore profileCompleted initialAssessmentCompleted"
  ).lean();
  if (!student) {
    const error = new Error("Student not found.");
    error.status = 404;
    throw error;
  }

  const [roadmap, results] = await Promise.all([
    Roadmap.findOne({ student: student._id })
      .select("careerGoal summary roadmapItems progress generatedAt updatedAt")
      .lean(),
    AssessmentResult.find({ student: student._id, completed: true })
      .select("assessment score totalMarks percentage submittedAt completed status expired attemptNumber")
      .populate("assessment", "title assessmentType passingMarks")
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean()
  ]);

  const resumeAnalysis = student.resumeAnalysis || {};
  const resumeJDAnalysis = student.resumeJDAnalysis || {};
  const profileCompleteness = calculateProfileCompleteness(student);
  const readinessMetrics = await calculatePlacementReadinessScore(student, results);
  const missingSkills = resumeAnalysis.missingSkills;
  const missingSkillsList = Array.isArray(missingSkills)
    ? stringArray(missingSkills)
    : [
      ...stringArray(missingSkills?.required),
      ...stringArray(missingSkills?.preferred)
    ];

  return {
    student: {
      id: student._id,
      name: student.fullName || student.name || "",
      email: student.email || "",
      emailVerified: student.isVerified === true,
      phone: student.phone || "",
      studentId: student.studentId || "",
      department: student.department || "",
      college: student.college || "",
      degree: student.degree || "",
      year: student.year ?? null,
      semester: student.semester ?? null,
      section: student.section || "",
      cgpa: student.cgpa ?? null,
      graduationYear: student.graduationYear ?? null,
      skills: stringArray(student.skills),
      profileCompleted: student.profileCompleted === true,
      initialAssessmentCompleted: student.initialAssessmentCompleted === true,
      profileCompletion: profileCompleteness.percentage,
      missingProfileFields: profileCompleteness.missingFields
    },
    codingProfile: {
      github: student.github || "",
      profiles: [
        ["GitHub", student.github],
        ["LeetCode", student.leetcode],
        ["CodeChef", student.codechef],
        ["HackerRank", student.hackerrank],
        ["Codeforces", student.codeforces]
      ].filter(([, url]) => Boolean(url)).map(([platform, url]) => ({ platform, url })),
      platforms: Array.isArray(student.codingProfile?.platforms)
        ? student.codingProfile.platforms.map((platform) => ({
          platform: platform.platform || "Unknown",
          profileUrl: platform.profileUrl || "",
          profileVerified: platform.profileVerified === true,
          badgesCount: countMetric(platform.badges),
          certificatesCount: countMetric(platform.certificates),
          problemsSolved: nullableNumber(platform.problemsSolved),
          totalSolved: nullableNumber(platform.totalSolved),
          easySolved: nullableNumber(platform.easySolved),
          mediumSolved: nullableNumber(platform.mediumSolved),
          hardSolved: nullableNumber(platform.hardSolved),
          contestsParticipated: nullableNumber(platform.contestsParticipated),
          currentRating: nullableNumber(platform.currentRating),
          maxRating: nullableNumber(platform.maxRating),
          statistics: Array.isArray(platform.statistics)
            ? platform.statistics
              .filter((statistic) => typeof statistic.label === "string")
              .map((statistic) => ({
                label: statistic.label,
                value: nullableNumber(statistic.value)
              }))
            : [],
          lastUpdated: platform.lastUpdated || null
        }))
        : [],
      totalProblemsSolved: nullableNumber(student.codingProfile?.totalProblemsSolved),
      easySolved: nullableNumber(student.codingProfile?.easySolved),
      mediumSolved: nullableNumber(student.codingProfile?.mediumSolved),
      hardSolved: nullableNumber(student.codingProfile?.hardSolved),
      contestsParticipated: nullableNumber(student.codingProfile?.contestsParticipated),
      score: nullableNumber(student.codingProfile?.score),
      level: student.codingProfile?.level || ""
    },
    resume: {
      uploaded: Boolean(student.resume || student.resumeOriginalName),
      fileName: student.resumeOriginalName || "",
      mimeType: student.resumeMimeType || "",
      size: nullableNumber(student.resumeSize),
      atsScore: readinessMetrics.breakdown.resume.score,
      jobMatchScore: nullableNumber(resumeJDAnalysis.jobMatchScore),
      analysisSummary: typeof resumeAnalysis.summary === "string" ? resumeAnalysis.summary : "",
      recommendations: stringArray(resumeJDAnalysis.recommendations || resumeAnalysis.recommendations),
      strengths: stringArray(resumeAnalysis.strengths),
      weaknesses: stringArray(resumeAnalysis.weaknesses),
      missingSkills: missingSkillsList
    },
    roadmap: roadmap ? {
      careerGoal: roadmap.careerGoal || "",
      summary: roadmap.summary || "",
      items: (roadmap.roadmapItems || []).map((item) => ({
        title: item.title,
        description: item.description || "",
        category: item.category || "",
        status: item.status || "Pending",
        week: item.week ?? null
      })),
      progress: roadmap.progress || null,
      generatedAt: roadmap.generatedAt || null,
      updatedAt: roadmap.updatedAt || null
    } : null,
    assessmentHistory: results.map((result) => {
      const passingMarks = nullableNumber(result.assessment?.passingMarks);
      return {
        id: result._id,
        name: result.assessment?.title || "Assessment",
        type: result.assessment?.assessmentType || "",
        date: result.submittedAt || null,
        marksObtained: nullableNumber(result.score) ?? 0,
        totalMarks: nullableNumber(result.totalMarks) ?? 0,
        percentage: nullableNumber(result.percentage) ?? 0,
        passed: passingMarks === null || passingMarks <= 0 ? null : Number(result.score) >= passingMarks,
        attemptNumber: result.attemptNumber ?? null
      };
    }),
    readiness: {
      percentage: readinessMetrics.score,
      score: readinessMetrics.score,
      level: readinessMetrics.level,
      explanation: readinessMetrics.explanation,
      breakdown: readinessMetrics.breakdown,
      factors: readinessMetrics.factors,
      recommendedActions: readinessMetrics.recommendedActions,
      lastCalculatedAt: new Date()
    }
  };
};

module.exports = { getStudentDetails };
