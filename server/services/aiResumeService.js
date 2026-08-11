const Student = require("../models/Student");
const AssessmentResult = require("../models/AssessmentResult");
const { analyzeResume } = require("./resumeAnalysisService");
const { calculatePlacementReadiness } = require("./readinessScoringService");
const { generateCareerRecommendation } = require("./careerRecommendationService");
const { generateAIResponse } = require("./geminiService");

const normalizeArray = (value) =>
  Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
    : [];

const normalizeScore = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.min(100, Math.max(0, Math.round(numberValue))) : 0;
};

const parseAIResponse = (responseText) => {
  const trimmedText = (responseText || "").trim();
  const jsonStart = trimmedText.indexOf("{");
  const jsonEnd = trimmedText.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error("Invalid AI response format");
  }

  const jsonText = trimmedText.slice(jsonStart, jsonEnd + 1);

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    throw new Error("Invalid AI response format");
  }
};

const buildStudentProfile = async (studentId) => {
  const student = await Student.findById(studentId)
    .select(
      "name department year section skills cgpa placementReadinessScore readinessProfile resume codingProfile"
    )
    .lean();

  if (!student) {
    throw new Error("Student not found");
  }

  const assessmentResults = await AssessmentResult.find({ student: studentId, completed: true })
    .select("percentage score recommendations strengths weaknesses topicAnalysis")
    .lean();

  return {
    student,
    assessmentResults
  };
};

const buildAssessmentSignals = (assessmentResults) => {
  const weaknesses = assessmentResults.flatMap((result) =>
    Array.isArray(result.weaknesses) ? result.weaknesses : []
  );

  return {
    assessmentCount: assessmentResults.length,
    weaknesses: [...new Set(weaknesses.filter((item) => typeof item === "string" && item.trim()))]
  };
};

const buildSkillGaps = (student, resumeAnalysis, readiness, assessmentSignals) => {
  const gaps = [];
  const skillCount = Array.isArray(student.skills) ? student.skills.filter(Boolean).length : 0;
  const normalizedCgpa = Number(student.cgpa) || 0;

  if (assessmentSignals.weaknesses.length > 0) {
    gaps.push({
      domain: "Assessment",
      title: "Weak assessment topics",
      severity: "High",
      evidence: assessmentSignals.weaknesses.slice(0, 5),
      recommendation: "Review your weakest assessment topics with targeted practice lessons."
    });
  }

  if (Array.isArray(resumeAnalysis.missingSkills) && resumeAnalysis.missingSkills.length > 0) {
    gaps.push({
      domain: "Resume",
      title: "Resume skill gaps",
      severity: "Medium",
      evidence: resumeAnalysis.missingSkills.slice(0, 5),
      recommendation: "Highlight missing skills, projects, and measurable achievements on your resume."
    });
  }

  if (student.codingProfile?.score < 70) {
    gaps.push({
      domain: "Coding",
      title: "Low coding profile performance",
      severity: "High",
      evidence: [`Coding profile score ${student.codingProfile?.score || 0}`],
      recommendation: "Improve your coding profile with consistent practice and problem-solving."
    });
  }

  if (skillCount < 4) {
    gaps.push({
      domain: "Profile",
      title: "Limited skill coverage",
      severity: "Medium",
      evidence: student.skills || [],
      recommendation: "Add more verified technical skills to your profile to strengthen your resume and placement readiness."
    });
  }

  if (normalizedCgpa < 6.5) {
    gaps.push({
      domain: "Academics",
      title: "CGPA below placement target",
      severity: "Medium",
      evidence: [`CGPA ${normalizedCgpa}`],
      recommendation: "Focus on improving CGPA and highlight strong academic projects or internships."
    });
  }

  if (readiness.score < 60) {
    gaps.push({
      domain: "Readiness",
      title: "Low placement readiness",
      severity: "High",
      evidence: readiness.recommendedActions || [],
      recommendation: "Follow a focused readiness improvement plan for resume, skills, and assessments."
    });
  }

  if (gaps.length === 0) {
    gaps.push({
      domain: "General",
      title: "No major gaps detected",
      severity: "Low",
      evidence: ["Your profile currently shows a solid baseline for placement preparation."],
      recommendation: "Continue improving your resume and technical skills to maintain readiness."
    });
  }

  return gaps;
};

const buildFallbackLearningRecommendations = (student, resumeAnalysis, assessmentSignals, readiness, skillGaps) => {
  const topCompanies = ["Google", "Microsoft", "Amazon", "Meta", "Infosys", "Accenture", "TCS", "Cognizant"];
  const recommendedCourses = [];
  const recommendedCertifications = [];
  const recommendedProjects = [];
  const interviewPreparation = [];
  const learningResources = [];
  const improvementAreas = [];

  if (resumeAnalysis.missingSkills.length > 0) {
    improvementAreas.push(`Add missing skills: ${resumeAnalysis.missingSkills.slice(0, 3).join(", ")}`);
    recommendedCourses.push(`Learn ${resumeAnalysis.missingSkills[0]} through a focused course`);
    learningResources.push(`Study resources for ${resumeAnalysis.missingSkills[0]}`);
  }

  if (student.codingProfile?.score < 70) {
    improvementAreas.push("Improve coding problem solving and accuracy.");
    recommendedCourses.push("Practice coding with structured algorithm courses.");
    interviewPreparation.push("Practice data structures and algorithms problems daily.");
  }

  if (assessmentSignals.weaknesses.length > 0) {
    improvementAreas.push(`Strengthen weak assessment topics: ${assessmentSignals.weaknesses.slice(0, 3).join(", ")}`);
    recommendedProjects.push("Build a small project covering your weak domains.");
  }

  if (readiness.score < 70) {
    improvementAreas.push("Refine your resume and placement profile.");
    interviewPreparation.push("Prepare for behavioral and technical interviews.");
  }

  if (recommendedCourses.length === 0) {
    recommendedCourses.push("Complete a full-stack development or domain-specific course.");
  }

  if (recommendedProjects.length === 0) {
    recommendedProjects.push("Build a portfolio project that showcases your strongest skills.");
  }

  if (interviewPreparation.length === 0) {
    interviewPreparation.push("Review common interview questions and practice mock interviews.");
  }

  if (learningResources.length === 0) {
    learningResources.push("Use curated online resources, tutorials, and project guides.");
  }

  if (recommendedCertifications.length === 0) {
    recommendedCertifications.push("Consider a relevant certification in your target domain.");
  }

  return {
    summary: "Personalized improvement recommendations generated from resume and readiness analysis.",
    recommendedCourses,
    recommendedCertifications,
    recommendedProjects,
    interviewPreparation,
    learningResources,
    improvementAreas,
    topCompanies: topCompanies.slice(0, 5),
    confidenceScore: normalizeScore(readiness.score)
  };
};

const normalizeLearningRecommendationResult = (result) => ({
  summary: typeof result?.summary === "string" ? result.summary.trim() : "",
  recommendedCourses: normalizeArray(result?.recommendedCourses),
  recommendedCertifications: normalizeArray(result?.recommendedCertifications),
  recommendedProjects: normalizeArray(result?.recommendedProjects),
  interviewPreparation: normalizeArray(result?.interviewPreparation),
  learningResources: normalizeArray(result?.learningResources),
  improvementAreas: normalizeArray(result?.improvementAreas),
  topCompanies: normalizeArray(result?.topCompanies),
  confidenceScore: normalizeScore(result?.confidenceScore)
});

const refreshResumeAnalysis = async (studentId) => {
  const student = await Student.findById(studentId).select("resume skills cgpa placementReadinessScore readinessProfile");

  if (!student) {
    throw new Error("Student not found");
  }

  if (!student.resume) {
    throw new Error("Resume not found");
  }

  const analysis = await analyzeResume(student.resume);
  const assessmentResults = await AssessmentResult.find({ student: studentId, completed: true }).select("percentage").lean();
  const readiness = calculatePlacementReadiness(student, analysis, assessmentResults);
  const readinessProfile = {
    score: readiness.score,
    level: readiness.level,
    explanation: readiness.explanation,
    recommendedActions: readiness.recommendedActions,
    lastCalculatedAt: new Date()
  };

  await Student.findByIdAndUpdate(studentId, {
    placementReadinessScore: readiness.score,
    readinessProfile
  });
  // Persist the resume analysis onto the student document so it can be retrieved without re-running AI
  await Student.findByIdAndUpdate(studentId, {
    resumeAnalysis: analysis
  });

  return {
    ...analysis,
    readinessProfile
  };
};

const getSkillGapAnalysis = async (studentId) => {
  const { student, assessmentResults } = await buildStudentProfile(studentId);

  if (!student.resume) {
    throw new Error("Resume not found");
  }

  const resumeAnalysis = await analyzeResume(student.resume);
  const readiness = calculatePlacementReadiness(student, resumeAnalysis, assessmentResults);
  const assessmentSignals = buildAssessmentSignals(assessmentResults);
  const skillGaps = buildSkillGaps(student, resumeAnalysis, readiness, assessmentSignals);

  return {
    resumeAnalysis,
    placementReadiness: readiness.score,
    readinessLevel: readiness.level,
    readinessExplanation: readiness.explanation,
    readinessRecommendedActions: readiness.recommendedActions,
    assessmentSignals,
    skillGaps
  };
};

const getLearningRecommendations = async (studentId) => {
  const { student, assessmentResults } = await buildStudentProfile(studentId);

  if (!student.resume) {
    throw new Error("Resume not found");
  }

  const resumeAnalysis = await analyzeResume(student.resume);
  const readiness = calculatePlacementReadiness(student, resumeAnalysis, assessmentResults);
  const assessmentSummary = assessmentResults.map((result) => ({
    percentage: result.percentage,
    score: result.score,
    strengths: result.strengths || [],
    weaknesses: result.weaknesses || []
  }));
  const assessmentSignals = buildAssessmentSignals(assessmentResults);
  const skillGaps = buildSkillGaps(student, resumeAnalysis, readiness, assessmentSignals);

  const prompt = `You are an expert student placement mentor.

Generate a personalized set of learning and placement recommendations for the student.

Return ONLY valid JSON.
Do NOT use markdown.
Do NOT include explanations.
Do NOT wrap the JSON inside code fences.

Return exactly this structure:
{
  "summary":"",
  "recommendedCourses":[],
  "recommendedCertifications":[],
  "recommendedProjects":[],
  "interviewPreparation":[],
  "learningResources":[],
  "improvementAreas":[],
  "topCompanies":[],
  "confidenceScore":0
}

Student Profile:
Name: ${student.name || ""}
Department: ${student.department || ""}
Year: ${student.year || ""}
Section: ${student.section || ""}
Skills: ${Array.isArray(student.skills) ? student.skills.join(", ") : ""}
CGPA: ${student.cgpa || 0}
Placement Readiness Score: ${student.placementReadinessScore || readiness.score}

Resume Analysis:
${JSON.stringify(resumeAnalysis)}

Assessment Summary:
${JSON.stringify(assessmentSummary)}

Skill Gaps:
${JSON.stringify(skillGaps)}

Placement Readiness:
${JSON.stringify(readiness)}
`;

  try {
    const responseText = await generateAIResponse(prompt);
    const parsed = parseAIResponse(responseText);
    return normalizeLearningRecommendationResult(parsed);
  } catch (error) {
    return buildFallbackLearningRecommendations(student, resumeAnalysis, assessmentSignals, readiness, skillGaps);
  }
};

const getPlacementRecommendation = async (studentId) => {
  return generateCareerRecommendation(studentId);
};

module.exports = {
  refreshResumeAnalysis,
  getSkillGapAnalysis,
  getLearningRecommendations,
  getPlacementRecommendation
};
