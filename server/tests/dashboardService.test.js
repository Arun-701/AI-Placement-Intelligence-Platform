const assert = require("assert");
const { buildDashboardSnapshot, buildSkillPerformance } = require("../services/dashboardService");

const payload = {
  student: {
    name: "Asha",
    department: "CSE",
    year: 3,
    section: "A"
  },
  readiness: {
    score: 78,
    level: "Medium",
    explanation: "Ready",
    recommendedActions: ["Improve resume", "Practice coding"]
  },
  resumeAnalysis: {
    resumeScore: 74,
    summary: "Strong backend profile",
    strengths: ["Node.js", "MongoDB"],
    missingSkills: ["Docker"],
    improvements: ["Add metrics"]
  },
  assessmentSummary: {
    averageScore: 82,
    totalAssessments: 2,
    completedAssessments: 2,
    latestAssessment: { score: 85, percentage: 85 },
    strengths: ["DSA"],
    weaknesses: ["System Design"]
  },
  codingSummary: {
    score: 65,
    level: "Medium",
    explanation: "Steady progress",
    totalProblemsSolved: 120,
    easySolved: 50,
    mediumSolved: 50,
    hardSolved: 20,
    contestsParticipated: 3
  },
  roadmap: {
    careerGoal: "Software Engineer",
    progress: {
      completedItems: 2,
      inProgressItems: 1,
      pendingItems: 5,
      completionPercentage: 25
    },
    roadmapItems: [{ title: "Practice APIs", status: "Pending" }],
    recommendations: {
      courses: [{ title: "Node.js course", status: "Pending" }],
      practiceTopics: [{ title: "API design", status: "Pending" }],
      learningResources: [{ title: "Docs", status: "Pending" }],
      miniProjects: [{ title: "Build a portfolio app", status: "Pending" }]
    },
    skillGaps: [{ domain: "Assessment", title: "Weak topics", severity: "High", priority: "High", evidence: ["Arrays"] }]
  }
};

const snapshot = buildDashboardSnapshot(payload);
assert.strictEqual(snapshot.overallPlacementReadiness.score, 78);
assert.strictEqual(snapshot.dashboardKpiCards.length >= 5, true);
assert.strictEqual(snapshot.recommendedNextActions.length >= 2, true);
assert.strictEqual(snapshot.learningRoadmapSummary.careerGoal, "Software Engineer");

const currentAnalysisSnapshot = buildDashboardSnapshot({
  ...payload,
  resumeAnalysis: { overallScore: 86, summary: "Current AI analysis" },
  skillPerformance: [{ category: "DSA", score: 78, questionCount: 14 }]
});
assert.strictEqual(currentAnalysisSnapshot.resumeSummary.resumeScore, 86);
assert.deepStrictEqual(currentAnalysisSnapshot.skillPerformance, [
  { category: "DSA", score: 78, questionCount: 14 }
]);

const persistedScoreSnapshot = buildDashboardSnapshot({
  ...payload,
  student: { ...payload.student, resumeScore: 76 },
  resumeScore: 76,
  resumeAnalysis: { overallScore: 58 }
});
assert.strictEqual(persistedScoreSnapshot.resumeSummary.resumeScore, 76);
assert.strictEqual(persistedScoreSnapshot.dashboardKpiCards.find((card) => card.title === "Resume Score").value, "76%");

const zeroResumeScoreSnapshot = buildDashboardSnapshot({
  ...payload,
  student: { ...payload.student, resumeScore: 0 },
  resumeScore: 0,
  resumeAnalysis: {}
});
assert.strictEqual(zeroResumeScoreSnapshot.resumeSummary.resumeScore, 0);
assert.strictEqual(zeroResumeScoreSnapshot.dashboardKpiCards.find((card) => card.title === "Resume Score").value, "0%");

const latestJDScoreSnapshot = buildDashboardSnapshot({
  ...payload,
  student: { ...payload.student, resumeJDAnalysis: { atsScore: 0 }, resumeScore: 76 },
  resumeAnalysis: { resumeScore: 82 }
});
assert.strictEqual(latestJDScoreSnapshot.resumeSummary.resumeScore, 0);

const noResumeScoreSnapshot = buildDashboardSnapshot({
  ...payload,
  student: payload.student,
  resumeScore: null,
  resumeAnalysis: {}
});
assert.strictEqual(noResumeScoreSnapshot.resumeSummary.resumeScore, null);
assert.strictEqual(noResumeScoreSnapshot.dashboardKpiCards.find((card) => card.title === "Resume Score").value, "—");

const clearedResumeScoreSnapshot = buildDashboardSnapshot({
  ...payload,
  student: { ...payload.student, resumeScore: null },
  resumeScore: null,
  resumeAnalysis: { overallScore: 84 }
});
assert.strictEqual(clearedResumeScoreSnapshot.resumeSummary.resumeScore, null);
assert.strictEqual(clearedResumeScoreSnapshot.dashboardKpiCards.find((card) => card.title === "Resume Score").value, "—");

const skillPerformance = buildSkillPerformance([{
  topicAnalysis: [
    { topic: "Data Structures and Algorithms", accuracy: 80, totalQuestions: 5 },
    { topic: "DSA", accuracy: 60, totalQuestions: 5 },
    { topic: "Aptitude", accuracy: 50, totalQuestions: 4 }
  ]
}]);
assert.deepStrictEqual(skillPerformance, [
  { category: "DSA", score: 70, questionCount: 10 },
  { category: "Aptitude", score: 50, questionCount: 4 }
]);
console.log("dashboard service snapshot test passed");
