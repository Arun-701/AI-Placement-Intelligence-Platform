const PLATFORM_HOSTS = {
    leetcode: "leetcode.com",
    hackerrank: "hackerrank.com",
    codechef: "codechef.com",
    github: "github.com",
    codeforces: "codeforces.com"
};

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
    profileVerified: payload.profileVerified === true,
    problemsSolved: payload.problemsSolved === null ? null : (Number(payload.problemsSolved ?? payload.totalSolved) || 0),
    badges: payload.badges === undefined ? null : payload.badges,
    contestDetails: payload.contestDetails === undefined ? null : payload.contestDetails,
    certificates: payload.certificates === undefined ? null : payload.certificates,
    skills: payload.skills === undefined ? null : payload.skills,
    currentRating: payload.currentRating === null || payload.currentRating === undefined ? null : Number(payload.currentRating),
    maxRating: payload.maxRating === null || payload.maxRating === undefined ? null : Number(payload.maxRating),
    lastUpdated: payload.lastUpdated || new Date(),
    totalSolved: payload.totalSolved === null ? null : (Number(payload.totalSolved) || 0),
    easySolved: payload.easySolved === null ? null : (Number(payload.easySolved) || 0),
    mediumSolved: payload.mediumSolved === null ? null : (Number(payload.mediumSolved) || 0),
    hardSolved: payload.hardSolved === null ? null : (Number(payload.hardSolved) || 0),
    contestsParticipated: Number(payload.contestsParticipated) || 0,
    statistics: Array.isArray(payload.statistics)
        ? payload.statistics.filter((stat) => typeof stat?.label === "string" && Number.isFinite(stat?.value))
            .map((stat) => ({ label: stat.label.trim(), value: Number(stat.value) }))
        : []
});

const validatePlatformUrl = (platform, value) => {
    if (!PLATFORM_HOSTS[platform] || typeof value !== "string" || value.trim() === "") return false;
    try {
        const url = new URL(value.trim());
        const host = url.hostname.toLowerCase();
        const expectedHost = PLATFORM_HOSTS[platform];
        return ["http:", "https:"].includes(url.protocol)
            && (host === expectedHost || host.endsWith(`.${expectedHost}`))
            && url.pathname.split("/").filter(Boolean).length > 0;
    } catch {
        return false;
    }
};

const getUsernameFromUrl = (profileUrl) => new URL(profileUrl).pathname.split("/").filter(Boolean).pop();

const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Profile could not be reached (${response.status})`);
    return response.json();
};

const fetchLeetCodeStatistics = async (profileUrl) => {
    const username = getUsernameFromUrl(profileUrl);
    const data = await fetchJson("https://leetcode.com/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            query: "query userProfile($username: String!) { matchedUser(username: $username) { username submitStats { acSubmissionNum { difficulty count } } badges { id name displayName icon creationDate category } } }",
            variables: { username }
        })
    });
    const matchedUser = data?.data?.matchedUser;
    const submissions = matchedUser?.submitStats?.acSubmissionNum;
    if (!Array.isArray(submissions)) throw new Error("LeetCode profile was not found or is unavailable");
    const counts = Object.fromEntries(submissions.map((item) => [item.difficulty, Number(item.count) || 0]));
    return buildPlatformAdapter("LeetCode", {
        profileUrl,
        profileVerified: true,
        problemsSolved: counts.All || 0,
        totalSolved: counts.All || 0,
        easySolved: counts.Easy || 0,
        mediumSolved: counts.Medium || 0,
        hardSolved: counts.Hard || 0,
        badges: Array.isArray(matchedUser.badges) ? matchedUser.badges.length : null,
        contestDetails: null,
        currentRating: null
    });
};

const fetchGitHubStatistics = async (profileUrl) => {
    const username = getUsernameFromUrl(profileUrl);
    const data = await fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}`, {
        headers: { Accept: "application/vnd.github+json", "User-Agent": "AI-Placement-Intelligence-Platform" }
    });
    return buildPlatformAdapter("GitHub", {
        profileUrl,
        profileVerified: true,
        statistics: [
            { label: "Public repositories", value: Number(data.public_repos) || 0 },
            { label: "Followers", value: Number(data.followers) || 0 },
            { label: "Following", value: Number(data.following) || 0 }
        ]
    });
};

const fetchCodeforcesStatistics = async (profileUrl) => {
    const handle = getUsernameFromUrl(profileUrl);
    const userData = await fetchJson(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`);
    const user = userData?.result?.[0];
    if (!user) throw new Error("Codeforces profile was not found or is unavailable");

    const [submissionsData, ratingsData] = await Promise.all([
        fetchJson(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}`),
        fetchJson(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`)
    ]);
    const acceptedProblems = new Set(
        (Array.isArray(submissionsData?.result) ? submissionsData.result : [])
            .filter((submission) => submission.verdict === "OK" && submission.problem?.contestId && submission.problem?.index)
            .map((submission) => `${submission.problem.contestId}-${submission.problem.index}`)
    );
    const contestHistory = Array.isArray(ratingsData?.result) ? ratingsData.result : [];
    return buildPlatformAdapter("Codeforces", {
        profileUrl,
        profileVerified: true,
        problemsSolved: acceptedProblems.size,
        totalSolved: acceptedProblems.size,
        badges: null,
        contestDetails: { contestsParticipated: contestHistory.length },
        certificates: null,
        currentRating: Number.isFinite(Number(user.rating)) ? Number(user.rating) : null,
        statistics: [
            ...(Number.isFinite(Number(user.rating)) ? [{ label: "Current rating", value: Number(user.rating) }] : []),
            ...(Number.isFinite(Number(user.maxRating)) ? [{ label: "Max rating", value: Number(user.maxRating) }] : []),
            { label: "Contests", value: contestHistory.length }
        ],
        maxRating: Number.isFinite(Number(user.maxRating)) ? Number(user.maxRating) : null
    });
};

const fetchCodeChefStatistics = async (profileUrl) => {
    const response = await fetch(profileUrl, { signal: AbortSignal.timeout(10000), headers: { "User-Agent": "AI-Placement-Intelligence-Platform" } });
    if (!response.ok) throw new Error(`CodeChef profile could not be reached (${response.status})`);
    const html = await response.text();
    const rating = html.match(/(?:Current Rating|rating-number)[^0-9]{0,100}(\d{3,5})/i)?.[1];
    const totalSolved = html.match(/Total Problems Solved\s*:\s*(\d+)/i)?.[1];
    if (!rating && totalSolved === undefined) throw new Error("CodeChef profile was not found or is unavailable");
    return buildPlatformAdapter("CodeChef", {
        profileUrl,
        profileVerified: true,
        problemsSolved: totalSolved === undefined ? null : Number(totalSolved),
        totalSolved: totalSolved === undefined ? null : Number(totalSolved),
        easySolved: null,
        mediumSolved: null,
        hardSolved: null,
        contestDetails: rating ? { currentRating: Number(rating) } : null,
        currentRating: rating ? Number(rating) : null,
        statistics: rating ? [{ label: "Current rating", value: Number(rating) }] : []
    });
};

const fetchHackerRankStatistics = async (profileUrl) => {
    const username = getUsernameFromUrl(profileUrl);
    const response = await fetch(`https://www.hackerrank.com/profile/${encodeURIComponent(username)}`, {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "AI-Placement-Intelligence-Platform" }
    });
    if (!response.ok) throw new Error(`HackerRank profile could not be reached (${response.status})`);
    const html = await response.text();
    const usernamePattern = new RegExp(`@(?:<!--\\s*-->)?${username.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}`, "i");
    if (!usernamePattern.test(html)) {
        throw new Error("HackerRank profile was not found or is unavailable");
    }
    const badgeToken = `class="hacker-badge"`;
    const badges = html.split(badgeToken).length - 1;
    return buildPlatformAdapter("HackerRank", {
        profileUrl,
        profileVerified: true,
        problemsSolved: null,
        totalSolved: null,
        easySolved: null,
        mediumSolved: null,
        hardSolved: null,
        badges,
        contestDetails: null,
        certificates: null,
        skills: null,
        statistics: [{ label: "Badges", value: badges }]
    });
};

const fetchPlatformStatistics = async (platform, profileUrl) => {
    if (platform === "leetcode") return fetchLeetCodeStatistics(profileUrl);
    if (platform === "github") return fetchGitHubStatistics(profileUrl);
    if (platform === "codeforces") return fetchCodeforcesStatistics(profileUrl);
    if (platform === "codechef") return fetchCodeChefStatistics(profileUrl);
    if (platform === "hackerrank") return fetchHackerRankStatistics(profileUrl);
    throw new Error("Unsupported coding platform");
};

const getPlatformConnectionSummary = (student) => {
    const connections = {
        githubConnected: validatePlatformUrl("github", student?.github || ""),
        leetcodeConnected: validatePlatformUrl("leetcode", student?.leetcode || ""),
        hackerrankConnected: validatePlatformUrl("hackerrank", student?.hackerrank || ""),
        codechefConnected: validatePlatformUrl("codechef", student?.codechef || ""),
        codeforcesConnected: validatePlatformUrl("codeforces", student?.codeforces || "")
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
    getPlatformConnectionSummary,
    fetchPlatformStatistics
};
