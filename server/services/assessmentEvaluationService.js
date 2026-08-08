const Assessment = require("../models/Assessment");
const AssessmentResult = require("../models/AssessmentResult");
const QuestionBank = require("../models/QuestionBank");

/**
 * Evaluate MCQ answer
 */
const evaluateMCQAnswer = (question, selectedAnswer) => {
    if (!question || question.questionType !== "MCQ") {
        return { isCorrect: false, marksObtained: 0 };
    }

    const isCorrect = selectedAnswer && selectedAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    const marksObtained = isCorrect ? question.marks : 0;

    return {
        isCorrect,
        marksObtained
    };
};

/**
 * Evaluate coding answer - Store code, placeholder for future compiler integration
 */
const evaluateCodingAnswer = (question, selectedAnswer) => {
    if (!question || question.questionType !== "Coding") {
        return { isCorrect: false, marksObtained: 0, status: "pending" };
    }

    // Store the code submission
    return {
        isCorrect: false, // Will be evaluated by compiler/manual review
        marksObtained: 0,
        status: "pending_evaluation",
        submittedCode: selectedAnswer,
        evaluatedAt: null
    };
};

/**
 * Evaluate subjective answer - Manual evaluation placeholder
 */
const evaluateSubjectiveAnswer = (question, selectedAnswer) => {
    if (!question || question.questionType !== "Subjective") {
        return { isCorrect: false, marksObtained: 0, status: "pending" };
    }

    // Placeholder for manual evaluation
    return {
        isCorrect: false,
        marksObtained: 0,
        status: "pending_manual_review",
        submittedAnswer: selectedAnswer,
        evaluatedAt: null
    };
};

/**
 * Evaluate all answers and calculate results
 */
const evaluateAnswers = async (assessmentId, answers) => {
    const assessment = await Assessment.findById(assessmentId).populate("questions");

    if (!assessment) {
        throw new Error("Assessment not found");
    }

    const evaluatedAnswers = [];
    let totalScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const topicScores = {};

    // Create a map for quick question lookup
    const questionMap = {};
    assessment.questions.forEach((q) => {
        questionMap[q._id.toString()] = q;
    });

    // Evaluate each answer
    for (const answer of answers) {
        const question = questionMap[answer.question.toString()];

        if (!question) {
            continue;
        }

        // Check if answer was skipped (empty or null)
        const isSkipped = !answer.selectedAnswer || answer.selectedAnswer.trim() === "";

        let evaluationResult;
        if (isSkipped) {
            skippedCount++;
            evaluationResult = {
                isCorrect: false,
                marksObtained: 0,
                status: "skipped"
            };
        } else {
            // Evaluate based on question type
            if (question.questionType === "MCQ") {
                evaluationResult = evaluateMCQAnswer(question, answer.selectedAnswer);
                if (evaluationResult.isCorrect) correctCount++;
                else wrongCount++;
            } else if (question.questionType === "Coding") {
                evaluationResult = evaluateCodingAnswer(question, answer.selectedAnswer);
                wrongCount++;
            } else if (question.questionType === "Subjective") {
                evaluationResult = evaluateSubjectiveAnswer(question, answer.selectedAnswer);
                wrongCount++;
            } else {
                // Aptitude, Technical, HR - treat as MCQ for now
                evaluationResult = evaluateMCQAnswer(question, answer.selectedAnswer);
                if (evaluationResult.isCorrect) correctCount++;
                else wrongCount++;
            }
        }

        // Track topic-wise scores
        const topic = question.topic || "General";
        if (!topicScores[topic]) {
            topicScores[topic] = {
                topic,
                correctAnswers: 0,
                totalQuestions: 0,
                score: 0,
                totalMarks: 0,
                accuracy: 0
            };
        }

        topicScores[topic].totalQuestions++;
        topicScores[topic].totalMarks += question.marks;

        if (evaluationResult.isCorrect) {
            topicScores[topic].correctAnswers++;
            topicScores[topic].score += question.marks;
        }

        totalScore += evaluationResult.marksObtained;

        evaluatedAnswers.push({
            question: answer.question,
            selectedAnswer: answer.selectedAnswer || "",
            isCorrect: evaluationResult.isCorrect,
            marksObtained: evaluationResult.marksObtained,
            ...evaluationResult
        });
    }

    // Calculate accuracy for each topic
    Object.keys(topicScores).forEach((topic) => {
        if (topicScores[topic].totalQuestions > 0) {
            topicScores[topic].accuracy = Math.round(
                (topicScores[topic].correctAnswers / topicScores[topic].totalQuestions) * 100
            );
        }
    });

    const percentage = assessment.totalMarks > 0 ? Math.round((totalScore / assessment.totalMarks) * 100) : 0;

    return {
        score: totalScore,
        totalMarks: assessment.totalMarks,
        percentage: Math.min(100, percentage),
        answers: evaluatedAnswers,
        stats: {
            correctAnswers: correctCount,
            wrongAnswers: wrongCount,
            skippedAnswers: skippedCount,
            totalQuestions: assessment.questions.length
        },
        topicAnalysis: Object.values(topicScores)
    };
};

/**
 * Identify strengths and weaknesses
 */
const identifyStrengthsAndWeaknesses = (evaluationResult, threshold = 70) => {
    const strengths = [];
    const weaknesses = [];

    evaluationResult.topicAnalysis.forEach((topic) => {
        if (topic.accuracy >= threshold) {
            strengths.push(`Strong in ${topic.topic} (${topic.accuracy}% accuracy)`);
        } else if (topic.accuracy < threshold && topic.accuracy > 0) {
            weaknesses.push(`Needs improvement in ${topic.topic} (${topic.accuracy}% accuracy)`);
        } else if (topic.accuracy === 0) {
            weaknesses.push(`Very weak in ${topic.topic} (0% accuracy)`);
        }
    });

    return { strengths, weaknesses };
};

/**
 * Generate recommendations based on performance
 */
const generateRecommendations = (evaluationResult, strengths, weaknesses) => {
    const recommendations = [];

    const { percentage } = evaluationResult;

    if (percentage >= 80) {
        recommendations.push("Excellent performance! Keep practicing to maintain this level");
        recommendations.push("Try harder difficulty questions to further improve");
    } else if (percentage >= 60) {
        recommendations.push("Good performance! Focus on weak topics to improve further");
        weaknesses.forEach((weakness) => {
            recommendations.push(`Work on: ${weakness}`);
        });
    } else if (percentage >= 40) {
        recommendations.push("Average performance. Dedicate more time to practice");
        recommendations.push("Review concepts in weak areas before next attempt");
        weaknesses.forEach((weakness) => {
            recommendations.push(`Priority: ${weakness}`);
        });
    } else {
        recommendations.push("Needs significant improvement. Start with basic concepts");
        recommendations.push("Review all topics systematically");
        recommendations.push("Practice similar questions multiple times");
    }

    return recommendations;
};

/**
 * Create assessment result with evaluation
 */
const createAssessmentResult = async (studentId, assessmentId, answers, timeTaken = 0) => {
    // Evaluate answers
    const evaluationResult = await evaluateAnswers(assessmentId, answers);

    // Identify strengths and weaknesses
    const { strengths, weaknesses } = identifyStrengthsAndWeaknesses(evaluationResult);

    // Generate recommendations
    const recommendations = generateRecommendations(evaluationResult, strengths, weaknesses);

    // Create result document
    const result = new AssessmentResult({
        student: studentId,
        assessment: assessmentId,
        score: evaluationResult.score,
        totalMarks: evaluationResult.totalMarks,
        percentage: evaluationResult.percentage,
        answers: evaluationResult.answers,
        strengths,
        weaknesses,
        recommendations,
        topicAnalysis: evaluationResult.topicAnalysis,
        submittedAt: new Date(),
        completed: true
    });

    await result.save();

    return result;
};

/**
 * Get result summary
 */
const getResultSummary = async (resultId) => {
    const result = await AssessmentResult.findById(resultId)
        .populate("student", "name email studentId department")
        .populate("assessment", "title totalMarks duration assessmentType")
        .lean();

    if (!result) {
        return null;
    }

    return {
        _id: result._id,
        student: result.student,
        assessment: result.assessment,
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        submittedAt: result.submittedAt,
        completed: result.completed,
        stats: {
            correctAnswers: result.answers.filter((a) => a.isCorrect).length,
            wrongAnswers: result.answers.filter((a) => !a.isCorrect && a.selectedAnswer).length,
            skippedAnswers: result.answers.filter((a) => !a.selectedAnswer).length,
            totalQuestions: result.answers.length
        },
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        recommendations: result.recommendations,
        topicAnalysis: result.topicAnalysis
    };
};

module.exports = {
    evaluateMCQAnswer,
    evaluateCodingAnswer,
    evaluateSubjectiveAnswer,
    evaluateAnswers,
    identifyStrengthsAndWeaknesses,
    generateRecommendations,
    createAssessmentResult,
    getResultSummary
};
