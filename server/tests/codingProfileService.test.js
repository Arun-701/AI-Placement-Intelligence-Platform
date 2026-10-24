const assert = require("node:assert/strict");
const { test } = require("node:test");
const { fetchCodeChefStatistics, fetchPlatformStatistics } = require("../services/codingProfileService");

test("CodeChef profile data keeps solved total unclassified when difficulty data is unavailable", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
        ok: true,
        text: async () => "<div>Current Rating: <strong>871</strong></div><div>Total Problems Solved: 404</div>"
    });

    try {
        const profile = await fetchCodeChefStatistics("https://www.codechef.com/users/example");
        assert.equal(profile.currentRating, 871);
        assert.equal(profile.totalSolved, 404);
        assert.equal(profile.easySolved, null);
        assert.equal(profile.mediumSolved, null);
        assert.equal(profile.hardSolved, null);
        assert.equal(profile.difficultyBreakdownAvailable, false);
        assert.equal(profile.unclassifiedSolved, 404);
    } finally {
        global.fetch = originalFetch;
    }
});

test("LeetCode difficulty counts are returned as a separate verified breakdown", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
        ok: true,
        json: async () => ({
            data: {
                matchedUser: {
                    submitStats: {
                        acSubmissionNum: [
                            { difficulty: "All", count: 14 },
                            { difficulty: "Easy", count: 12 },
                            { difficulty: "Medium", count: 2 },
                            { difficulty: "Hard", count: 0 }
                        ]
                    },
                    badges: []
                }
            }
        })
    });

    try {
        const profile = await fetchPlatformStatistics("leetcode", "https://leetcode.com/example");
        assert.equal(profile.totalSolved, 14);
        assert.equal(profile.easySolved + profile.mediumSolved + profile.hardSolved, 14);
        assert.equal(profile.difficultyBreakdownAvailable, true);
        assert.equal(profile.unclassifiedSolved, 0);
    } finally {
        global.fetch = originalFetch;
    }
});
