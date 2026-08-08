const URL_REGEX = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[^\s]*)?$/;

const calculateCodingSkillScore = (codingProfile) => {
    const totalSolved = Number(codingProfile?.totalProblemsSolved) || 0;
    const easySolved = Number(codingProfile?.easySolved) || 0;
    const mediumSolved = Number(codingProfile?.mediumSolved) || 0;
    const hardSolved = Number(codingProfile?.hardSolved) || 0;
    const contests = Number(codingProfile?.contestsParticipated) || 0;

    const weightedScore = (easySolved * 1) + (mediumSolved * 2) + (hardSolved * 3);
    const normalized = totalSolved > 0 ? weightedScore / Math.max(totalSolved, 1) : 0;
    const contestBoost = Math.min(20, contests * 2);
    const difficultyScore = Math.min(100, Math.round((normalized * 20) + contestBoost));

    let level = "Low";
    if (difficultyScore >= 80) {
        level = "High";
    } else if (difficultyScore >= 50) {
        level = "Medium";
    }

    return {
        score: Math.min(100, difficultyScore),
        level,
        explanation: "Coding skill score is calculated from solved problem volume, difficulty mix, and contest participation using rule-based logic.",
        totalProblemsSolved: totalSolved,
        easySolved,
        mediumSolved,
        hardSolved,
        contestsParticipated: contests
    };
};

const buildPlatformAdapter = (platformName, payload = {}) => ({
    platform: platformName,
    profileUrl: typeof payload.profileUrl === "string" ? payload.profileUrl : "",
    totalSolved: Number(payload.totalSolved) || 0,
    easySolved: Number(payload.easySolved) || 0,
    mediumSolved: Number(payload.mediumSolved) || 0,
    hardSolved: Number(payload.hardSolved) || 0,
    contestsParticipated: Number(payload.contestsParticipated) || 0
});

const validatePlatformUrl = (platform, value) => {
    if (typeof value !== "string" || value.trim() === "") {
        return false;
    }

    if (!URL_REGEX.test(value.trim())) {
        return false;
    }

    const normalized = value.trim().toLowerCase();
    if (platform === "github") {
        return normalized.includes("github.com/");
    }
    if (platform === "leetcode") {
        return normalized.includes("leetcode.com/");
    }
    if (platform === "hackerrank") {
        return normalized.includes("hackerrank.com/");
    }
    if (platform === "codechef") {
        return normalized.includes("codechef.com/");
    }
    if (platform === "linkedin") {
        return normalized.includes("linkedin.com/");
    }

    return true;
};

const getPlatformConnectionSummary = (student) => {
    const connections = {
        githubConnected: validatePlatformUrl("github", student?.github || ""),
        leetcodeConnected: validatePlatformUrl("leetcode", student?.leetcode || ""),
        hackerrankConnected: validatePlatformUrl("hackerrank", student?.hackerrank || ""),
        codechefConnected: validatePlatformUrl("codechef", student?.codechef || ""),
        linkedinConnected: validatePlatformUrl("linkedin", student?.linkedin || "")
    };

    const connectedCount = Object.values(connections).filter(Boolean).length;
    const completionPercentage = Math.round((connectedCount / 5) * 100);
    const codingProfileScore = connectedCount * 20;

    return {
        ...connections,
        completionPercentage,
        codingProfileScore
    };
};

module.exports = {
    calculateCodingSkillScore,
    buildPlatformAdapter,
    validatePlatformUrl,
    getPlatformConnectionSummary
};
