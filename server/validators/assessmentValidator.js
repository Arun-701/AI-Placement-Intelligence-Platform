const mongoose = require("mongoose");
const Assessment = require("../models/Assessment");
const Student = require("../models/Student");
const AssessmentResult = require("../models/AssessmentResult");

/**
 * Validate assessment exists and is published
 */
const validateAssessmentExists = async (assessmentId) => {
    if (!mongoose.isValidObjectId(assessmentId)) {
        return { valid: false, message: "Invalid assessment ID" };
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
        return { valid: false, message: "Assessment not found" };
    }

    if (!assessment.isActive || assessment.status !== "Published") {
        return { valid: false, message: "Assessment is not available" };
    }

    return { valid: true, assessment };
};

/**
 * Validate student is assigned to assessment
 */
const validateStudentAssigned = (assessment, studentId) => {
    const studentIdStr = studentId.toString();
    const hasExplicitAssignments = Array.isArray(assessment.assignedStudents) && assessment.assignedStudents.length > 0;
    
    if (assessment.isInitialAssessment) {
        return { valid: true };
    }

    if (!hasExplicitAssignments) {
        return { valid: true };
    }

    const isAssigned = assessment.assignedStudents.some(
        (assigned) => assigned && assigned.toString() === studentIdStr
    );

    if (!isAssigned) {
        return { valid: false, message: "You are not assigned to this assessment" };
    }

    return { valid: true };
};

/**
 * Validate assessment deadline
 */
const validateAssessmentDeadline = (assessment) => {
    const now = new Date();

    if (assessment.startDate && new Date(assessment.startDate) > now) {
        return { valid: false, message: "Assessment has not started yet" };
    }

    if (assessment.endDate && new Date(assessment.endDate) < now) {
        return { valid: false, message: "Assessment deadline has expired." };
    }

    return { valid: true };
};

/**
 * Validate no duplicate attempts
 */
const validateNoDuplicateAttempt = async (studentId, assessmentId) => {
    const existingResult = await AssessmentResult.findOne({
        student: studentId,
        assessment: assessmentId
    });

    if (existingResult) {
        return { valid: false, message: "You have already attempted this assessment" };
    }

    return { valid: true };
};

/**
 * Validate student exists and is active
 */
const validateStudentActive = async (studentId) => {
    if (!mongoose.isValidObjectId(studentId)) {
        return { valid: false, message: "Invalid student ID" };
    }

    const student = await Student.findById(studentId);
    if (!student) {
        return { valid: false, message: "Student not found" };
    }

    if (!student.isActive) {
        return { valid: false, message: "Student account is deactivated" };
    }

    return { valid: true, student };
};

/**
 * Validate answers structure
 */
const validateAnswers = (answers, assessmentQuestions) => {
    if (!Array.isArray(answers)) {
        return { valid: false, message: "Answers must be an array" };
    }

    if (answers.length === 0) {
        return { valid: false, message: "At least one answer is required" };
    }

    // Validate each answer has required fields
    for (const answer of answers) {
        if (!answer || typeof answer !== "object") {
            return { valid: false, message: "Invalid answer format" };
        }

        if (!mongoose.isValidObjectId(answer.question)) {
            return { valid: false, message: "Invalid question ID in answers" };
        }

        if (answer.selectedAnswer === undefined || answer.selectedAnswer === null) {
            return { valid: false, message: "Each answer must have a selectedAnswer field" };
        }
    }

    // Check for duplicate questions
    const questionIds = answers.map((a) => a.question.toString());
    const uniqueQuestionIds = [...new Set(questionIds)];
    
    if (uniqueQuestionIds.length !== questionIds.length) {
        return { valid: false, message: "Cannot answer the same question multiple times" };
    }

    // Check all assessment questions are answered
    if (assessmentQuestions && assessmentQuestions.length > 0) {
        const assessmentQuestionIds = assessmentQuestions.map((q) => q.toString());
        if (questionIds.length !== assessmentQuestionIds.length) {
            return { valid: false, message: `All ${assessmentQuestionIds.length} questions must be answered` };
        }

        const allQuestionsAnswered = assessmentQuestionIds.every((qId) =>
            questionIds.includes(qId)
        );

        if (!allQuestionsAnswered) {
            return { valid: false, message: "You must answer all assessment questions" };
        }
    }

    return { valid: true };
};

/**
 * Validate auto-save data
 */
const validateAutoSaveData = (autoSaveData) => {
    if (!autoSaveData || typeof autoSaveData !== "object") {
        return { valid: false, message: "Invalid auto-save data format" };
    }

    if (!mongoose.isValidObjectId(autoSaveData.assessment)) {
        return { valid: false, message: "Invalid assessment ID" };
    }

    if (!Array.isArray(autoSaveData.answers)) {
        return { valid: false, message: "Answers must be an array" };
    }

    if (typeof autoSaveData.timeSpent !== "number" || autoSaveData.timeSpent < 0) {
        return { valid: false, message: "Time spent must be a non-negative number" };
    }

    return { valid: true };
};

module.exports = {
    validateAssessmentExists,
    validateStudentAssigned,
    validateAssessmentDeadline,
    validateNoDuplicateAttempt,
    validateStudentActive,
    validateAnswers,
    validateAutoSaveData
};
