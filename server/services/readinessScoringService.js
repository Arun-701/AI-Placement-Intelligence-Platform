const CGPA_MAX_SCALE = 10;
const MAX_TECHNICAL_SKILLS = 8;
const TARGET_READINESS_SCORE = 70;
const SUPPORTED_CODING_PLATFORMS = new Set([
    "leetcode",
    "codechef",
    "hackerrank",
    "codeforces"
]);

const COMPONENTS = [
    { key: "cgpa", componentName: "CGPA", weight: 15 },
    { key: "resume", componentName: "Resume", weight: 25 },
    { key: "assessment", componentName: "Assessment", weight: 25 },
    { key: "technicalSkills", componentName: "Technical Skills", weight: 15 },
    { key: "codingProfile", componentName: "Coding Profile", weight: 20 }
];

const optionalNumber = (value) => {
    if (value === null || value === undefined || value === "" || typeof value === "boolean") {
        return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const normalizePercent = (value) => {
    const number = optionalNumber(value);
    return number === null ? null : Math.min(100, Math.max(0, number));
};

const getValidAssessmentResults = (assessmentResults) => (
    (Array.isArray(assessmentResults) ? assessmentResults : [])
        .filter((result) => result?.completed === true && result.expired !== true && result.status !== "expired")
        .filter((result) => {
            const score = optionalNumber(result.score);
            const totalMarks = optionalNumber(result.totalMarks);
            return score !== null && totalMarks !== null && totalMarks > 0 && score >= 0 && score <= totalMarks;
        })
);

const getAssessmentScore = (assessmentResults) => {
    const validResults = getValidAssessmentResults(assessmentResults);
    const percentages = validResults.map((result) =>
        (Number(result.score) / Number(result.totalMarks)) * 100
    );

    return percentages.length > 0
        ? percentages.reduce((total, percentage) => total + percentage, 0) / percentages.length
        : null;
};

const getResumeATSScore = (student) => {
    if (!student?.resume) return null;
    const analysis = student.resumeAnalysis || {};
    return normalizePercent(analysis.atsScore ?? analysis.atsAnalysis?.score);
};

const getTechnicalSkillsScore = (student) => {
    if (!Array.isArray(student?.skills)) return null;
    const uniqueSkills = new Set(
        student.skills
            .filter((skill) => typeof skill === "string" && skill.trim())
            .map((skill) => skill.trim().toLocaleLowerCase())
    );
    if (uniqueSkills.size === 0) return null;
    return Math.min(100, (uniqueSkills.size / MAX_TECHNICAL_SKILLS) * 100);
};

const hasCodingPerformanceMetrics = (codingProfile) => (
    Array.isArray(codingProfile?.platforms) &&
    codingProfile.platforms.some((platform) => {
        if (platform?.profileVerified !== true) return false;
        const platformName = String(platform.platform || "").trim().toLowerCase();
        if (!SUPPORTED_CODING_PLATFORMS.has(platformName)) return false;

        return platform.difficultyBreakdownAvailable === true
            || optionalNumber(platform.problemsSolved) !== null
            || optionalNumber(platform.totalSolved) !== null;
    })
);

const getCodingProfileScore = (student) => {
    if (!hasCodingPerformanceMetrics(student?.codingProfile)) return null;
    return normalizePercent(student.codingProfile.score);
};

const getReadinessLevel = (score) => {
    if (score >= 70) return "High";
    if (score >= 40) return "Medium";
    return "Low";
};

const buildRecommendations = (components, score) => {
    const recommendations = [];
    const componentByKey = new Map(components.map((component) => [component.key, component]));

    if (!componentByKey.get("cgpa").available) recommendations.push("Add your CGPA to your profile");
    if (!componentByKey.get("resume").available) recommendations.push("Complete a successful Resume AI analysis");
    else if (componentByKey.get("resume").score < 70) recommendations.push("Improve your resume ATS score");
    if (!componentByKey.get("assessment").available) recommendations.push("Complete an assessment to establish your performance score");
    else if (componentByKey.get("assessment").score < 60) recommendations.push("Practice assessments to improve your performance");
    if (!componentByKey.get("technicalSkills").available) recommendations.push("Add technical skills to your profile");
    else if (componentByKey.get("technicalSkills").score < 60) recommendations.push("Expand your technical skills profile");
    if (!componentByKey.get("codingProfile").available) recommendations.push("Connect a supported coding profile with performance metrics");
    else if (componentByKey.get("codingProfile").score < 60) recommendations.push("Practice coding problems and contests");
    if (score >= 70) recommendations.push("You are on track for placements. Keep building your skills.");

    return recommendations;
};

const calculatePlacementReadiness = (student, assessmentResults = []) => {
    const cgpa = optionalNumber(student?.cgpa);
    const cgpaScore = cgpa === null || cgpa < 0 || cgpa > CGPA_MAX_SCALE
        ? null
        : (cgpa / CGPA_MAX_SCALE) * 100;
    const componentScores = {
        cgpa: cgpaScore,
        resume: getResumeATSScore(student),
        assessment: getAssessmentScore(assessmentResults),
        technicalSkills: getTechnicalSkillsScore(student),
        codingProfile: getCodingProfileScore(student)
    };

    const components = COMPONENTS.map(({ key, componentName, weight }) => {
        const score = componentScores[key];
        const available = score !== null;
        return {
            key,
            componentName,
            score,
            weight,
            contribution: available ? Number((score * weight / 100).toFixed(2)) : 0,
            available
        };
    });
    const score = Number(components.reduce((total, component) => total + component.contribution, 0).toFixed(2));
    const level = getReadinessLevel(score);
    const breakdown = Object.fromEntries(components.map((component) => [component.key, {
        score: component.score,
        weight: component.weight,
        contribution: component.contribution,
        available: component.available
    }]));

    return {
        score,
        targetScore: TARGET_READINESS_SCORE,
        level,
        factors: components,
        breakdown,
        explanation: "Placement readiness is the weighted total of CGPA, Resume AI ATS score, completed assessment performance, technical skills, and verified coding-platform performance. Unavailable sections contribute zero.",
        recommendedActions: buildRecommendations(components, score)
    };
};

module.exports = {
    COMPONENTS,
    TARGET_READINESS_SCORE,
    calculatePlacementReadiness,
    getReadinessLevel,
    getValidAssessmentResults
};
