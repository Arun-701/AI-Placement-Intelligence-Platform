const Assessment = require("../models/Assessment");
const AssessmentResult = require("../models/AssessmentResult");
const Student = require("../models/Student");
const QuestionBank = require("../models/QuestionBank");
const {
    validateAssessmentExists,
    validateStudentAssigned,
    validateAssessmentDeadline,
    validateNoDuplicateAttempt,
    validateStudentActive,
    validateAnswers,
    validateAutoSaveData
} = require("../validators/assessmentValidator");
const {
    createAssessmentResult
} = require("./assessmentEvaluationService");
const { updateStudentReadinessProfile } = require("./readinessService");

/**
 * Get all assessments assigned to a student
 */
const getAssignedAssessments = async (studentId) => {
    const student = await Student.findById(studentId);

    if (!student) {
        throw new Error("Student not found");
    }

    // Find all published assessments where student is assigned or assessment is open to all
    const assessments = await Assessment.find({
        status: "Published",
        isActive: true,
        $or: [
            { assignedStudents: { $in: [studentId] } },
            { assignedStudents: { $size: 0 } },
            { isInitialAssessment: true }
        ]
    })
        .select("_id title description assessmentType totalMarks duration startDate endDate isInitialAssessment")
        .lean();

    // Get attempt status for each assessment
    const assessmentsWithStatus = await Promise.all(
        assessments.map(async (assessment) => {
            const result = await AssessmentResult.findOne({
                student: studentId,
                assessment: assessment._id
            }).lean();

            return {
                ...assessment,
                attemptStatus: result ? "Completed" : "Pending",
                attempted: !!result,
                score: result?.score || null,
                percentage: result?.percentage || null,
                submittedAt: result?.submittedAt || null
            };
        })
    );

    return assessmentsWithStatus;
};

/**
 * Start assessment - Validate and return questions
 */
const startAssessment = async (studentId, assessmentId) => {
    // Validate assessment exists
    const assessmentValidation = await validateAssessmentExists(assessmentId);
    if (!assessmentValidation.valid) {
        throw new Error(assessmentValidation.message);
    }

    const assessment = assessmentValidation.assessment;

    // Validate student is active
    const studentValidation = await validateStudentActive(studentId);
    if (!studentValidation.valid) {
        throw new Error(studentValidation.message);
    }

    // Validate student is assigned
    const assignmentValidation = validateStudentAssigned(assessment, studentId);
    if (!assignmentValidation.valid) {
        throw new Error(assignmentValidation.message);
    }

    // Validate deadline
    const deadlineValidation = validateAssessmentDeadline(assessment);
    if (!deadlineValidation.valid) {
        throw new Error(deadlineValidation.message);
    }

    // Validate no duplicate attempts
    const duplicateValidation = await validateNoDuplicateAttempt(studentId, assessmentId);
    if (!duplicateValidation.valid) {
        throw new Error(duplicateValidation.message);
    }

    // Populate questions with full details
    const fullAssessment = await Assessment.findById(assessmentId).populate({
        path: "questions",
        select: "_id title question questionType marks options difficulty topic"
    });

    // Remove correct answers from questions for student view
    const questionsForStudent = fullAssessment.questions.map((q) => {
        const qObj = q.toObject();
        delete qObj.correctAnswer;
        delete qObj.explanation;
        return qObj;
    });

    return {
        assessment: {
            _id: assessment._id,
            title: assessment.title,
            description: assessment.description,
            totalMarks: assessment.totalMarks,
            duration: assessment.duration,
            startDate: assessment.startDate,
            endDate: assessment.endDate
        },
        questions: questionsForStudent,
        startedAt: new Date(),
        timeLimit: assessment.duration
    };
};

/**
 * Auto-save assessment attempt
 */
const autoSaveAttempt = async (studentId, autoSaveData) => {
    // Validate auto-save data
    const validation = validateAutoSaveData(autoSaveData);
    if (!validation.valid) {
        throw new Error(validation.message);
    }

    const { assessment: assessmentId, answers, timeSpent } = autoSaveData;

    // Check if assessment exists
    const assessmentValidation = await validateAssessmentExists(assessmentId);
    if (!assessmentValidation.valid) {
        throw new Error(assessmentValidation.message);
    }

    // Store or update auto-save data in a temporary collection/cache
    // For now, we'll just validate it can be saved
    // In production, you might store this in Redis or a separate AutoSaveAttempt collection

    return {
        saved: true,
        timeSpent,
        answersCount: answers.length,
        assessmentId,
        studentId,
        savedAt: new Date()
    };
};

/**
 * Submit assessment and evaluate
 */
const submitAssessment = async (studentId, assessmentId, answers, timeTaken = 0) => {
    // Validate assessment exists
    const assessmentValidation = await validateAssessmentExists(assessmentId);
    if (!assessmentValidation.valid) {
        throw new Error(assessmentValidation.message);
    }

    const assessment = assessmentValidation.assessment;

    // Validate student is active
    const studentValidation = await validateStudentActive(studentId);
    if (!studentValidation.valid) {
        throw new Error(studentValidation.message);
    }

    // Validate student is assigned
    const assignmentValidation = validateStudentAssigned(assessment, studentId);
    if (!assignmentValidation.valid) {
        throw new Error(assignmentValidation.message);
    }

    // Validate deadline
    const deadlineValidation = validateAssessmentDeadline(assessment);
    if (!deadlineValidation.valid) {
        throw new Error(deadlineValidation.message);
    }

    // Validate no duplicate attempts
    const duplicateValidation = await validateNoDuplicateAttempt(studentId, assessmentId);
    if (!duplicateValidation.valid) {
        throw new Error(duplicateValidation.message);
    }

    // Validate answers format
    const answersValidation = validateAnswers(answers, assessment.questions);
    if (!answersValidation.valid) {
        throw new Error(answersValidation.message);
    }

    // Create and evaluate result
    const result = await createAssessmentResult(studentId, assessmentId, answers, timeTaken);

    // Update student assessments completed count
    await Student.findByIdAndUpdate(
        studentId,
        { $inc: { assessmentsCompleted: 1 } },
        { new: true }
    );

    // Update readiness score
    const student = await Student.findById(studentId);
    await updateStudentReadinessProfile(studentId);

    return {
        _id: result._id,
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        message: `Assessment submitted! Your score: ${result.percentage}%`,
        submittedAt: result.submittedAt
    };
};

/**
 * Get assessment attempt history
 */
const getAssessmentHistory = async (studentId) => {
    const results = await AssessmentResult.find({ student: studentId })
        .populate("assessment", "_id title assessmentType totalMarks duration")
        .select("_id score percentage submittedAt")
        .sort({ submittedAt: -1 })
        .lean();

    return results.map((result) => ({
        _id: result._id,
        assessment: result.assessment,
        score: result.score,
        percentage: result.percentage,
        submittedAt: result.submittedAt
    }));
};

/**
 * Get detailed assessment result
 */
const getAssessmentResult = async (studentId, resultId) => {
    const result = await AssessmentResult.findById(resultId)
        .populate("assessment", "_id title description assessmentType totalMarks duration")
        .populate({
            path: "answers.question",
            select: "_id title question questionType marks correctAnswer explanation topic options"
        });

    if (!result) {
        throw new Error("Result not found");
    }

    // Verify student owns this result
    if (result.student.toString() !== studentId.toString()) {
        throw new Error("Unauthorized access to result");
    }

    // Prepare result with detailed answer explanations
    const answers = result.answers.map((answer) => ({
        questionId: answer.question._id,
        title: answer.question.title,
        question: answer.question.question,
        questionType: answer.question.questionType,
        marks: answer.question.marks,
        topic: answer.question.topic,
        studentAnswer: answer.selectedAnswer,
        correctAnswer: answer.question.correctAnswer,
        isCorrect: answer.isCorrect,
        marksObtained: answer.marksObtained,
        explanation: answer.question.explanation,
        options: answer.question.options
    }));

    return {
        _id: result._id,
        assessment: result.assessment,
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        submittedAt: result.submittedAt,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        recommendations: result.recommendations,
        topicAnalysis: result.topicAnalysis,
        answers: {
            totalQuestions: result.answers.length,
            correct: result.answers.filter((a) => a.isCorrect).length,
            wrong: result.answers.filter((a) => !a.isCorrect && a.selectedAnswer).length,
            skipped: result.answers.filter((a) => !a.selectedAnswer).length,
            details: answers
        }
    };
};

module.exports = {
    getAssignedAssessments,
    startAssessment,
    autoSaveAttempt,
    submitAssessment,
    getAssessmentHistory,
    getAssessmentResult
};
