const Student = require("../models/Student");
const AssessmentResult = require("../models/AssessmentResult");

/**
 * Calculate profile completion percentage
 * Based on: name, email, fullName, phone, department, year, skills, interests, linkedin, github, leetcode, codechef, hackerrank
 */
const calculateProfileCompletion = (student) => {
    const profileFields = [
        "name",
        "email",
        "fullName",
        "phone",
        "department",
        "year",
        "skills",
        "interests",
        "linkedin",
        "github",
        "leetcode",
        "codechef",
        "hackerrank"
    ];

    let completedFields = 0;

    profileFields.forEach((field) => {
        const value = student[field];
        if (field === "skills" || field === "interests") {
            if (Array.isArray(value) && value.length > 0) completedFields++;
        } else {
            if (value && value.toString().trim().length > 0) completedFields++;
        }
    });

    return Math.round((completedFields / profileFields.length) * 100);
};

/**
 * Calculate average assessment score
 */
const calculateAverageAssessmentScore = async (studentId) => {
    const results = await AssessmentResult.find({
        student: studentId,
        completed: true
    });

    if (results.length === 0) {
        return { average: 0, count: 0, percentage: 0 };
    }

    const totalScore = results.reduce((sum, result) => sum + (result.percentage || 0), 0);
    const average = Math.round(totalScore / results.length);

    return {
        average,
        count: results.length,
        percentage: average
    };
};

/**
 * Get coding profile score
 */
const getCodingProfileScore = (student) => {
    return student.codingProfile?.score || 0;
};

/**
 * Check if resume is uploaded
 */
const isResumeUploaded = (student) => {
    return !!(student.resume && student.resume.trim().length > 0);
};

/**
 * Check if email is verified
 */
const isEmailVerified = (student) => {
    return !!student.isVerified;
};

/**
 * Calculate overall placement readiness score
 * Formula:
 * - Profile Completion: 20%
 * - Assessment Score: 40%
 * - Coding Profile: 20%
 * - Resume Uploaded: 10%
 * - Email Verified: 10%
 */
const calculatePlacementReadinessScore = async (student) => {
    const profileCompletion = calculateProfileCompletion(student);
    const assessmentScore = await calculateAverageAssessmentScore(student._id);
    const codingScore = getCodingProfileScore(student);
    const resumeUploaded = isResumeUploaded(student) ? 100 : 0;
    const emailVerified = isEmailVerified(student) ? 100 : 0;

    // Weighted calculation
    const score = Math.round(
        (profileCompletion * 0.2) +
        (assessmentScore.percentage * 0.4) +
        (codingScore * 0.2) +
        (resumeUploaded * 0.1) +
        (emailVerified * 0.1)
    );

    return {
        score: Math.min(100, Math.max(0, score)),
        breakdown: {
            profileCompletion,
            assessmentScore: assessmentScore.percentage,
            codingProfile: codingScore,
            resumeUploaded: resumeUploaded > 0,
            emailVerified: emailVerified > 0
        }
    };
};

/**
 * Determine readiness level
 */
const getReadinessLevel = (score) => {
    if (score >= 70) return "High";
    if (score >= 40) return "Medium";
    return "Low";
};

/**
 * Generate readiness recommendations based on score breakdown
 */
const generateReadinessRecommendations = (breakdown, score) => {
    const recommendations = [];

    if (breakdown.profileCompletion < 75) {
        recommendations.push("Complete your profile information to improve placement chances");
    }

    if (breakdown.assessmentScore < 60) {
        recommendations.push("Attempt more assessments and practice to improve your score");
    }

    if (breakdown.codingProfile < 60) {
        recommendations.push("Practice coding problems on platforms like LeetCode, CodeChef");
    }

    if (!breakdown.resumeUploaded) {
        recommendations.push("Upload your resume to increase readiness score");
    }

    if (!breakdown.emailVerified) {
        recommendations.push("Verify your email address");
    }

    if (score >= 70) {
        recommendations.push("Great! You are ready for placements. Keep preparing!");
    } else if (score >= 40) {
        recommendations.push("You are on the right track. Focus on weak areas to improve");
    } else {
        recommendations.push("Focus on profile completion and assessment practice");
    }

    return recommendations;
};

/**
 * Update student readiness profile
 */
const updateStudentReadinessProfile = async (studentId) => {
    const student = await Student.findById(studentId);

    if (!student) {
        throw new Error("Student not found");
    }

    const readinessData = await calculatePlacementReadinessScore(student);
    const level = getReadinessLevel(readinessData.score);
    const recommendations = generateReadinessRecommendations(readinessData.breakdown, readinessData.score);

    const explanation = `Your placement readiness score is ${readinessData.score}%. Profile: ${readinessData.breakdown.profileCompletion}%, Assessments: ${readinessData.breakdown.assessmentScore}%, Coding: ${readinessData.breakdown.codingProfile}%`;

    student.placementReadinessScore = readinessData.score;
    student.readinessProfile = {
        score: readinessData.score,
        level,
        explanation,
        recommendedActions: recommendations,
        lastCalculatedAt: new Date()
    };

    await student.save();

    return {
        score: readinessData.score,
        level,
        explanation,
        recommendations,
        breakdown: readinessData.breakdown,
        lastCalculatedAt: new Date()
    };
};

/**
 * Get student readiness score
 */
const getStudentReadinessScore = async (studentId) => {
    const student = await Student.findById(studentId);

    if (!student) {
        throw new Error("Student not found");
    }

    return {
        score: student.placementReadinessScore || 0,
        level: student.readinessProfile?.level || "Low",
        explanation: student.readinessProfile?.explanation || "",
        recommendations: student.readinessProfile?.recommendedActions || [],
        lastCalculatedAt: student.readinessProfile?.lastCalculatedAt || null
    };
};

module.exports = {
    calculatePlacementReadinessScore,
    getReadinessLevel,
    generateReadinessRecommendations,
    updateStudentReadinessProfile,
    getStudentReadinessScore,
    calculateProfileCompletion,
    calculateAverageAssessmentScore,
    getCodingProfileScore,
    isResumeUploaded,
    isEmailVerified
};
