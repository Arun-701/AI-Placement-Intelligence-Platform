const test = require("node:test");
const assert = require("node:assert/strict");
const { calculatePlacementReadiness } = require("../services/readinessScoringService");

const completeStudent = {
    cgpa: 8,
    resume: "uploads/resumes/student.pdf",
    resumeAnalysis: { atsAnalysis: { score: 80 } },
    skills: ["JavaScript", "React", "Node.js", "SQL"],
    codingProfile: {
        score: 60,
        platforms: [{ platform: "LeetCode", profileVerified: true, problemsSolved: 50 }]
    }
};

const completedAssessment = {
    completed: true,
    score: 15,
    totalMarks: 20
};

test("applies all five normalized weights and reports weighted contributions", () => {
    const readiness = calculatePlacementReadiness(completeStudent, [completedAssessment]);

    assert.equal(readiness.score, 70.25);
    assert.equal(readiness.targetScore, 70);
    assert.equal(readiness.level, "High");
    assert.deepEqual(readiness.factors.map(({ componentName, weight }) => [componentName, weight]), [
        ["CGPA", 15],
        ["Resume", 25],
        ["Assessment", 25],
        ["Technical Skills", 15],
        ["Coding Profile", 20]
    ]);
    assert.equal(readiness.factors.reduce((total, component) => total + component.contribution, 0), readiness.score);
    assert.equal(readiness.breakdown.cgpa.score, 80);
    assert.equal(readiness.breakdown.resume.score, 80);
    assert.equal(readiness.breakdown.assessment.score, 75);
    assert.equal(readiness.breakdown.technicalSkills.score, 50);
    assert.equal(readiness.breakdown.codingProfile.score, 60);
});

test("does not use missing or unrelated resume scores", () => {
    const student = {
        ...completeStudent,
        resumeAnalysis: {},
        resumeScore: 95,
        resumeJDAnalysis: { atsScore: 90 }
    };
    const readiness = calculatePlacementReadiness(student, [completedAssessment]);

    assert.equal(readiness.breakdown.resume.score, null);
    assert.equal(readiness.breakdown.resume.available, false);
    assert.equal(readiness.breakdown.resume.contribution, 0);
    assert.equal(readiness.score, 50.25);
});

test("does not award a CGPA contribution when CGPA is missing", () => {
    const { cgpa, ...student } = completeStudent;
    const readiness = calculatePlacementReadiness(student, [completedAssessment]);

    assert.equal(readiness.breakdown.cgpa.score, null);
    assert.equal(readiness.breakdown.cgpa.contribution, 0);
    assert.equal(readiness.score, 58.25);
});

test("marks missing assessments and coding profiles unavailable", () => {
    const noAssessments = calculatePlacementReadiness(completeStudent, []);
    assert.equal(noAssessments.breakdown.assessment.score, null);
    assert.equal(noAssessments.breakdown.assessment.contribution, 0);
    assert.equal(noAssessments.score, 51.5);

    const { codingProfile, ...studentWithoutCoding } = completeStudent;
    const noCodingProfile = calculatePlacementReadiness(studentWithoutCoding, [completedAssessment]);
    assert.equal(noCodingProfile.breakdown.codingProfile.score, null);
    assert.equal(noCodingProfile.breakdown.codingProfile.available, false);
    assert.equal(noCodingProfile.breakdown.codingProfile.contribution, 0);
});

test("counts zero marks as a completed assessment score of zero", () => {
    const readiness = calculatePlacementReadiness(completeStudent, [
        { completed: true, score: 0, totalMarks: 20 }
    ]);

    assert.equal(readiness.breakdown.assessment.score, 0);
    assert.equal(readiness.breakdown.assessment.available, true);
    assert.equal(readiness.score, 51.5);
});

test("ignores uncompleted, expired-like, and invalid assessment results", () => {
    const readiness = calculatePlacementReadiness(completeStudent, [
        { completed: false, score: 20, totalMarks: 20 },
        { completed: true, status: "expired", score: 20, totalMarks: 20, submittedAt: null },
        { completed: true, score: 20, totalMarks: 0 },
        { completed: true, score: 21, totalMarks: 20 }
    ]);

    assert.equal(readiness.breakdown.assessment.score, null);
    assert.equal(readiness.score, 51.5);
});

test("deduplicates technical skills and changes coding score only from verified supported metrics", () => {
    const withDuplicateSkills = calculatePlacementReadiness({
        ...completeStudent,
        skills: ["React", "react", " React ", "JavaScript"]
    }, [completedAssessment]);
    assert.equal(withDuplicateSkills.breakdown.technicalSkills.score, 25);

    const githubOnly = calculatePlacementReadiness({
        ...completeStudent,
        codingProfile: {
            score: 100,
            platforms: [{ platform: "GitHub", profileVerified: true, statistics: [{ label: "Public repositories", value: 100 }] }]
        }
    }, [completedAssessment]);
    assert.equal(githubOnly.breakdown.codingProfile.score, null);

    const changedPlatformScore = calculatePlacementReadiness({
        ...completeStudent,
        codingProfile: {
            score: 80,
            platforms: [{ platform: "CodeChef", profileVerified: true, problemsSolved: 120 }]
        }
    }, [completedAssessment]);
    assert.equal(changedPlatformScore.breakdown.codingProfile.score, 80);
    assert.equal(changedPlatformScore.score, 74.25);
});

test("preserves genuine zero resume and coding scores", () => {
    const readiness = calculatePlacementReadiness({
        ...completeStudent,
        resumeAnalysis: { atsAnalysis: { score: 0 } },
        codingProfile: {
            score: 0,
            platforms: [{ platform: "LeetCode", profileVerified: true, difficultyBreakdownAvailable: true }]
        }
    }, [completedAssessment]);

    assert.equal(readiness.breakdown.resume.score, 0);
    assert.equal(readiness.breakdown.resume.available, true);
    assert.equal(readiness.breakdown.codingProfile.score, 0);
    assert.equal(readiness.breakdown.codingProfile.available, true);
    assert.equal(Number.isNaN(readiness.score), false);
});

test("returns a finite zero score when all five components are missing", () => {
    const readiness = calculatePlacementReadiness({}, []);
    assert.equal(readiness.score, 0);
    assert.equal(readiness.factors.every((component) => !component.available && component.contribution === 0), true);
    assert.equal(Number.isFinite(readiness.score), true);
});
