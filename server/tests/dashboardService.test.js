const assert = require("assert");
const { buildDashboardSnapshot } = require("../services/dashboardService");

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
console.log("dashboard service snapshot test passed");
