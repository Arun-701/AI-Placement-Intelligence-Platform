const Student = require("../models/Student");
const AssessmentResult = require("../models/AssessmentResult");
const {
    calculatePlacementReadiness,
    getReadinessLevel,
    getValidAssessmentResults
} = require("./readinessScoringService");

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

    const completedFields = profileFields.filter((field) => {
        const value = student[field];
        if (field === "skills" || field === "interests") return Array.isArray(value) && value.length > 0;
        return value !== null && value !== undefined && String(value).trim().length > 0;
    }).length;

    return Math.round((completedFields / profileFields.length) * 100);
};

const loadAssessmentResults = async (studentId) => AssessmentResult.find({
    student: studentId,
    completed: true
}).select("score totalMarks completed status expired").lean();

const calculateAverageAssessmentScore = async (studentId) => {
    const assessmentResults = await loadAssessmentResults(studentId);
    const readiness = calculatePlacementReadiness({}, assessmentResults);
    const validResults = getValidAssessmentResults(assessmentResults);

    return {
        average: readiness.breakdown.assessment.score === null
            ? 0
            : Math.round(readiness.breakdown.assessment.score),
        count: validResults.length,
        percentage: readiness.breakdown.assessment.score === null
            ? 0
            : readiness.breakdown.assessment.score
    };
};

const getCodingProfileScore = (student) => {
    const readiness = calculatePlacementReadiness(student);
    return readiness.breakdown.codingProfile.score ?? 0;
};

const isResumeUploaded = (student) => !!(student.resume && student.resume.trim().length > 0);
const isEmailVerified = (student) => !!student.isVerified;

const calculatePlacementReadinessScore = async (student, assessmentResults) => {
    const results = assessmentResults || await loadAssessmentResults(student._id);
    return calculatePlacementReadiness(student, results);
};

const attachPlacementReadinessScores = async (students) => {
    const records = Array.isArray(students) ? students : [];
    if (records.length === 0) return records;

    const ids = records.map((student) => student._id);
    const results = await AssessmentResult.find({
        student: { $in: ids },
        completed: true
    }).select("student score totalMarks completed status expired").lean();
    const resultsByStudent = new Map();
    results.forEach((result) => {
        const studentId = result.student.toString();
        const studentResults = resultsByStudent.get(studentId) || [];
        studentResults.push(result);
        resultsByStudent.set(studentId, studentResults);
    });

    return records.map((student) => {
        const readiness = calculatePlacementReadiness(
            student,
            resultsByStudent.get(student._id.toString()) || []
        );
        return {
            ...student,
            placementReadinessScore: readiness.score,
            readinessProfile: {
                ...student.readinessProfile,
                score: readiness.score,
                level: readiness.level,
                explanation: readiness.explanation,
                recommendedActions: readiness.recommendedActions,
                breakdown: readiness.breakdown,
                factors: readiness.factors
            }
        };
    });
};

const generateReadinessRecommendations = (breakdown, score) => {
    const recommendations = [];
    if (breakdown.cgpa?.available === false) recommendations.push("Add your CGPA to your profile");
    if (breakdown.resume?.available === false) recommendations.push("Complete a successful Resume AI analysis");
    if (breakdown.assessment?.available === false) recommendations.push("Complete an assessment to establish your performance score");
    if (breakdown.technicalSkills?.available === false) recommendations.push("Add technical skills to your profile");
    if (breakdown.codingProfile?.available === false) recommendations.push("Connect a supported coding profile with performance metrics");
    if (score >= 70) recommendations.push("You are on track for placements. Keep building your skills.");
    return recommendations;
};

const updateStudentReadinessProfile = async (studentId) => {
    const student = await Student.findById(studentId);
    if (!student) throw new Error("Student not found");

    const readiness = await calculatePlacementReadinessScore(student);
    const lastCalculatedAt = new Date();
    student.placementReadinessScore = readiness.score;
    student.readinessProfile = {
        score: readiness.score,
        level: readiness.level,
        explanation: readiness.explanation,
        recommendedActions: readiness.recommendedActions,
        lastCalculatedAt
    };
    await student.save();

    return {
        ...readiness,
        percentage: readiness.score,
        lastCalculatedAt
    };
};

const getStudentReadinessScore = async (studentId) => {
    const student = await Student.findById(studentId);
    if (!student) throw new Error("Student not found");

    const readiness = await calculatePlacementReadinessScore(student);
    return {
        ...readiness,
        percentage: readiness.score,
        lastCalculatedAt: new Date()
    };
};

module.exports = {
    calculatePlacementReadinessScore,
    attachPlacementReadinessScores,
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
