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

    // Check if student already has an in-progress attempt for this assessment
    const existingStudent = await Student.findById(studentId).select('currentAttempt');
    if (existingStudent && existingStudent.currentAttempt && existingStudent.currentAttempt.assessmentId && existingStudent.currentAttempt.assessmentId.toString() === assessmentId.toString() && existingStudent.currentAttempt.status === 'in-progress') {
        const startedAtExisting = existingStudent.currentAttempt.startedAt;
        const dueAtExisting = existingStudent.currentAttempt.dueAt;
        // Populate questions with full details
        const fullAssessment = await Assessment.findById(assessmentId).populate({
            path: "questions",
            select: "_id title question questionType marks options difficulty topic"
        });

        // Remove correct answers from questions for student view
        const questionsForStudentExisting = fullAssessment.questions.map((q) => {
            const qObj = q.toObject();
            delete qObj.correctAnswer;
            delete qObj.explanation;
            return qObj;
        });

        const durationMinutes = assessment.duration || 30; // default to 30 minutes if not set
        const dueAt = new Date(startedAtExisting.getTime() + durationMinutes * 60 * 1000);
        return {
            assessment: {
                _id: assessment._id,
                title: assessment.title,
                description: assessment.description,
                totalMarks: assessment.totalMarks,
                duration: assessment.duration || 30,
                startDate: assessment.startDate,
                endDate: assessment.endDate
            },
            questions: questionsForStudentExisting,
            startedAt: startedAtExisting,
            dueAt: dueAt,
            timeLimit: durationMinutes
        };
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

    // Persist student's current attempt so timer can be enforced server-side
    const startedAt = new Date();
        const durationMinutes = assessment.duration || 30; // default to 30 minutes if not set
        const dueAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

    await Student.findByIdAndUpdate(studentId, {
        currentAttempt: {
            assessmentId: assessment._id,
            startedAt,
            dueAt,
            status: 'in-progress'
        }
    });

    return {
        assessment: {
            _id: assessment._id,
            title: assessment.title,
            description: assessment.description,
            totalMarks: assessment.totalMarks,
                duration: assessment.duration || 30,
            startDate: assessment.startDate,
            endDate: assessment.endDate
        },
        questions: questionsForStudent,
        startedAt,
        dueAt,
            timeLimit: durationMinutes
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

    // Verify server-side that student's attempt has not expired (based on student's currentAttempt)
    const student = await Student.findById(studentId);
    if (!student) throw new Error("Student not found");

    if (student.currentAttempt && student.currentAttempt.assessmentId && student.currentAttempt.assessmentId.toString() === assessmentId.toString()) {
        if (student.currentAttempt.dueAt && new Date() > new Date(student.currentAttempt.dueAt)) {
            // mark expired
            student.currentAttempt.status = 'expired';
            await student.save();
            throw new Error('Assessment time has expired');
        }
    }

    // Create and evaluate result
    const result = await createAssessmentResult(studentId, assessmentId, answers, timeTaken);

    // Update student assessments completed count
    await Student.findByIdAndUpdate(
        studentId,
        { $inc: { assessmentsCompleted: 1 } },
        { new: true }
    );

    // If this was an initial assessment, mark it completed on student record
    try {
        if (assessment.isInitialAssessment) {
            await Student.findByIdAndUpdate(studentId, {
                initialAssessmentCompleted: true,
                initialAssessmentResult: result._id
            });
        }
    } catch (e) {
        console.error('Failed to mark initialAssessmentCompleted:', e.message);
    }

    // Update readiness score
    await updateStudentReadinessProfile(studentId);
    // mark student's current attempt as completed if it matches
    try {
        const s = await Student.findById(studentId);
        if (s && s.currentAttempt && s.currentAttempt.assessmentId && s.currentAttempt.assessmentId.toString() === assessmentId.toString()) {
            s.currentAttempt.status = 'completed';
            s.currentAttempt.startedAt = s.currentAttempt.startedAt || new Date();
            s.currentAttempt.dueAt = s.currentAttempt.dueAt || null;
            await s.save();
        }
    } catch (e) {
        console.error('Failed to update student currentAttempt status:', e.message);
    }
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
