const calculatePlacementReadiness = (student, resumeAnalysis, assessmentResults = []) => {
    const skillCount = Array.isArray(student?.skills) ? student.skills.filter(Boolean).length : 0;
    const cgpa = Number(student?.cgpa) || 0;
    const resumeScore = Number(resumeAnalysis?.resumeScore) || 0;
    const assessmentAverage = assessmentResults.length > 0
        ? assessmentResults.reduce((total, result) => total + Number(result?.percentage || 0), 0) / assessmentResults.length
        : 0;

    const scoreComponents = [];

    let score = 0;

    const addScore = (componentName, weight, value) => {
        score += weight * value;
        scoreComponents.push({ componentName, weight, value });
    };

    const normalizedCgpa = Math.min(10, Math.max(0, cgpa)) / 10;
    addScore("CGPA", 0.25, normalizedCgpa);

    const normalizedResume = Math.min(100, Math.max(0, resumeScore)) / 100;
    addScore("Resume", 0.25, normalizedResume);

    const normalizedAssessments = Math.min(100, Math.max(0, assessmentAverage)) / 100;
    addScore("Assessments", 0.25, normalizedAssessments);

    const skillFactor = Math.min(1, skillCount / 8);
    addScore("Skills", 0.25, skillFactor);

    score = Math.round(score * 100);

    const readiness = {
        score,
        level: score >= 80 ? "High" : score >= 60 ? "Medium" : "Low",
        factors: scoreComponents,
        explanation: `Readiness score combines CGPA, resume quality, assessment performance, and skill coverage.`,
        recommendedActions: []
    };

    if (score < 60) {
        readiness.recommendedActions.push("Strengthen your resume and core technical skills");
    }

    if (score < 80) {
        readiness.recommendedActions.push("Improve assessment performance with targeted practice");
    }

    if (skillCount < 4) {
        readiness.recommendedActions.push("Add more relevant skills to your profile");
    }

    if (resumeScore < 70) {
        readiness.recommendedActions.push("Refine your resume to highlight measurable achievements");
    }

    return readiness;
};

module.exports = {
    calculatePlacementReadiness
};
