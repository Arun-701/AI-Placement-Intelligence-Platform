const Assessment = require("../models/Assessment");
const AssessmentResult = require("../models/AssessmentResult");
const AssessmentAttendanceRequest = require("../models/AssessmentAttendanceRequest");
const ReattemptAssignment = require("../models/ReattemptAssignment");
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
const { getAssessmentVisibility } = require("../utils/assessmentVisibility");
const { getReattemptSetAvailability } = require("../utils/reattemptSetAvailability");

const getStudentAssessmentQuestionIds = (assessment, studentId) => {
    if (!assessment.usesMultiSetAssignment) return assessment.questions;
    const assignment = (assessment.setAssignments || []).find((set) =>
        (set.assignedStudents || []).some((assigned) => assigned.toString() === studentId.toString())
    );
    const questionSet = assignment && assessment.questionSets?.[assignment.setIndex];
    const legacyQuestionIds = questionSet?.questionIds || questionSet?.toObject?.().questionIds;
    return questionSet?.questions?.length ? questionSet.questions : legacyQuestionIds || [];
};

const getQuestionSetIds = (assessment, setIndex) => {
    const questionSet = assessment.questionSets?.[setIndex];
    if (questionSet?.questions?.length) return questionSet.questions;
    if (questionSet?.questionIds?.length) return questionSet.questionIds;
    return assessment.questionSets?.length ? [] : assessment.questions || [];
};

const getStudentAssessmentAssignment = (assessment, studentId) => {
    if (!assessment.usesMultiSetAssignment) return null;
    return (assessment.setAssignments || []).find((set) =>
        (set.assignedStudents || []).some((assigned) => assigned.toString() === studentId.toString())
    ) || null;
};

const getActiveReattemptAssignment = (assessmentId, studentId) => ReattemptAssignment.findOne({
    assessment: assessmentId,
    students: studentId,
    active: { $ne: false },
}).sort({ createdAt: -1 });

/**
 * Get all assessments assigned to a student
 */
const getAssignedAssessments = async (studentId) => {
    const student = await Student.findById(studentId);

    if (!student) {
        throw new Error("Student not found");
    }

    // Get completed assessments for this student to include in results
    const completedResults = await AssessmentResult.find({ student: studentId }).select("assessment").lean();
    const completedAssessmentIds = completedResults.map(r => r.assessment);

    let assessments = [];
    const initialAssessment = await Assessment.findOne({
        status: "Published",
        isActive: true,
        isInitialAssessment: true,
        title: { $ne: "Initial Onboarding Assessment" }
    })
        .select("_id title description assessmentType totalMarks duration startDate endDate isInitialAssessment")
        .lean();

    if (student.initialAssessmentCompleted) {
        // After initial assessment is complete, show:
        // 1. All assigned or open assessments (excluding initial assessments)
        const availableAssessments = await Assessment.find({
            status: "Published",
            isActive: true,
            isInitialAssessment: { $ne: true },
            title: { $ne: "Initial Onboarding Assessment" },
            $or: [
                { assignedStudents: { $in: [studentId] } },
                { assignedStudents: { $size: 0 }, usesMultiSetAssignment: { $ne: true } },
                { usesMultiSetAssignment: true, "setAssignments.assignedStudents": studentId }
            ]
        })
            .select("_id title description assessmentType totalMarks duration startDate endDate isInitialAssessment usesMultiSetAssignment setAssignments questionSets questions")
            .populate("questions", "_id marks")
            .lean();

        // 2. All completed assessments (for history)
        const completedAssessments = await Assessment.find({
            _id: { $in: completedAssessmentIds },
            status: "Published",
            isActive: true
        })
            .select("_id title description assessmentType totalMarks duration startDate endDate isInitialAssessment")
            .lean();

        // 3. Keep the completed Initial Assessment visible in the list even after onboarding completion.
        // The existing duplicate-attempt protection in submit/start validation remains unchanged.
        const assessmentMap = new Map();
        availableAssessments.forEach(a => assessmentMap.set(a._id.toString(), a));
        completedAssessments.forEach(a => assessmentMap.set(a._id.toString(), a));
        if (initialAssessment) {
            assessmentMap.set(initialAssessment._id.toString(), initialAssessment);
        }
        assessments = Array.from(assessmentMap.values());
    } else {
        // During onboarding, show only the initial assessment
        assessments = initialAssessment ? [initialAssessment] : [];
    }

    // Get attempt status for each assessment
    const priorReattemptAssignments = await ReattemptAssignment.find({
        assessment: { $in: assessments.map((assessment) => assessment._id) },
        students: studentId,
    }).select("assessment students setIndex").lean();
    const priorReattemptsByAssessment = new Map();
    priorReattemptAssignments.forEach((assignment) => {
        const key = assignment.assessment.toString();
        priorReattemptsByAssessment.set(key, [...(priorReattemptsByAssessment.get(key) || []), assignment]);
    });

    const assessmentsWithStatus = await Promise.all(
        assessments.map(async (assessment) => {
            const latestResult = await AssessmentResult.findOne({
                student: studentId,
                assessment: assessment._id
            }).sort({ submittedAt: -1, createdAt: -1 }).lean();

            const reattemptAssignment = await getActiveReattemptAssignment(assessment._id, studentId);
            const assignment = reattemptAssignment || getStudentAssessmentAssignment(assessment, studentId);
            const studentEndDate = assignment?.endDate || assessment.endDate;
            const expiry = getAssessmentVisibility(studentEndDate);
            const isExplicitlyAssigned = assessment.usesMultiSetAssignment
                ? Boolean(assignment)
                : (assessment.assignedStudents || []).some((assigned) => String(assigned) === String(studentId));
            const result = reattemptAssignment ? null : latestResult;
            const activeRequest = reattemptAssignment ? null : await AssessmentAttendanceRequest.findOne({
                student: studentId,
                assessment: assessment._id,
                active: { $ne: false },
            }).select("_id status").lean();
            const assignedSetIndex = Number.isInteger(reattemptAssignment?.setIndex)
                ? reattemptAssignment.setIndex
                : assignment?.setIndex;
            const assignedQuestionIds = assessment.usesMultiSetAssignment || reattemptAssignment
                ? getQuestionSetIds(assessment, assignedSetIndex)
                : assessment.questions || [];
            const questionsById = new Map((assessment.questions || []).map((question) => [String(question?._id || question), question]));
            const retestAvailability = getReattemptSetAvailability({
                assessment,
                studentIds: [studentId],
                previousReattemptAssignments: priorReattemptsByAssessment.get(assessment._id.toString()) || [],
                originalAssignments: assignment && Number.isInteger(Number(assignedSetIndex))
                    ? [{ student: studentId, setIndex: Number(assignedSetIndex) }]
                    : [],
            });
            const retestAvailable = retestAvailability.availableSetIndexes.length > 0;

            return {
                ...assessment,
                ...((assessment.usesMultiSetAssignment || reattemptAssignment) ? (assignment ? {
                        startDate: assignment.startDate,
                        endDate: assignment.endDate,
                        assignedSetIndex,
                        totalMarks: assignedQuestionIds.reduce((total, questionId) => {
                            const question = questionsById.get(String(questionId?._id || questionId));
                            return total + (Number(question?.marks) || 0);
                        }, 0)
                    } : {}) : {}),
                reattemptAssigned: Boolean(reattemptAssignment),
                requestStatus: activeRequest?.status || null,
                requestMessage: activeRequest?.status === "Cancelled"
                    ? "Your retest request was cancelled by the administrator."
                    : null,
                expired: expiry.expired && !reattemptAssignment,
                retestAvailable,
                canRequestAttendance: !result && !reattemptAssignment && !activeRequest && isExplicitlyAssigned && expiry.withinRequestWindow && retestAvailable,
                postDeadlineVisibleUntil: expiry.visibilityEndsAt || null,
                withinPostDeadlineVisibility: expiry.visible,
                attemptStatus: result ? "Completed" : "Pending",
                attempted: !!result,
                resultId: result?._id || null,
                score: result ? result.score : null,
                percentage: result ? result.percentage : null,
                submittedAt: result?.submittedAt || null,
            };
        })
    );

    return assessmentsWithStatus.filter((assessment) =>
        assessment.attemptStatus === "Completed" ||
        assessment.reattemptAssigned ||
        assessment.withinPostDeadlineVisibility
    ).map((assessment) => {
        const studentAssessment = { ...assessment };
        delete studentAssessment.questionSets;
        delete studentAssessment.withinPostDeadlineVisibility;
        return studentAssessment;
    });
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
    const reattemptAssignment = await getActiveReattemptAssignment(assessmentId, studentId);
    if (reattemptAssignment) {
        const activeRequest = await AssessmentAttendanceRequest.exists({
            _id: { $in: reattemptAssignment.requests },
            student: studentId,
            assessment: assessmentId,
            active: { $ne: false },
            status: { $in: ["Requested", "Assigned"] },
        });
        if (!activeRequest) throw new Error("This re-attempt request is no longer active");
    }
    const studentAssignment = reattemptAssignment || getStudentAssessmentAssignment(assessment, studentId);
    const selectedQuestionIds = reattemptAssignment
        ? getQuestionSetIds(assessment, reattemptAssignment.setIndex)
        : getStudentAssessmentQuestionIds(assessment, studentId);
    if (!selectedQuestionIds?.length) throw new Error("No questions are configured for your assigned set");

    // Validate student is active
    const studentValidation = await validateStudentActive(studentId);
    if (!studentValidation.valid) {
        throw new Error(studentValidation.message);
    }

    if (assessment.isInitialAssessment && studentValidation.student.initialAssessmentCompleted) {
        throw new Error("Initial onboarding assessment has already been completed");
    }

    // Validate student is assigned
    const assignmentValidation = reattemptAssignment
        ? { valid: true, assignment: studentAssignment }
        : validateStudentAssigned(assessment, studentId);
    if (!assignmentValidation.valid) {
        throw new Error(assignmentValidation.message);
    }

    // Validate deadline
    const deadlineValidation = validateAssessmentDeadline(assessment, studentId, reattemptAssignment);
    if (!deadlineValidation.valid) {
        throw new Error(deadlineValidation.message);
    }

    // Validate no duplicate attempts
    const duplicateValidation = await validateNoDuplicateAttempt(studentId, assessmentId, reattemptAssignment?._id);
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
        const questionsForStudentExisting = fullAssessment.questions.filter((q) => selectedQuestionIds.some((id) => id.toString() === q._id.toString())).map((q) => {
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
                startDate: studentAssignment?.startDate || assessment.startDate,
                endDate: studentAssignment?.endDate || assessment.endDate
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
    const questionsForStudent = fullAssessment.questions.filter((q) => selectedQuestionIds.some((id) => id.toString() === q._id.toString())).map((q) => {
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
            reattemptAssignmentId: reattemptAssignment?._id || null,
            startedAt,
            dueAt,
            status: 'in-progress'
        }
    });

    const assignedTotalMarks = questionsForStudent.reduce((total, question) => total + (Number(question.marks) || 0), 0);
    return {
        assessment: {
            _id: assessment._id,
            title: assessment.title,
            description: assessment.description,
            totalMarks: reattemptAssignment || assessment.usesMultiSetAssignment ? assignedTotalMarks : assessment.totalMarks,
            questionSetIndex: reattemptAssignment?.setIndex ?? studentAssignment?.setIndex ?? null,
            reattemptAssignmentId: reattemptAssignment?._id || null,
                duration: assessment.duration || 30,
        startDate: studentAssignment?.startDate || assessment.startDate,
        endDate: studentAssignment?.endDate || assessment.endDate
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
    const reattemptAssignment = await getActiveReattemptAssignment(assessmentId, studentId);
    if (reattemptAssignment) {
        const activeRequest = await AssessmentAttendanceRequest.exists({
            _id: { $in: reattemptAssignment.requests },
            student: studentId,
            assessment: assessmentId,
            active: { $ne: false },
            status: { $in: ["Requested", "Assigned"] },
        });
        if (!activeRequest) throw new Error("This re-attempt request is no longer active");
    }

    const studentAssignmentValidation = reattemptAssignment
        ? { valid: true, assignment: reattemptAssignment }
        : validateStudentAssigned(assessment, studentId);
    if (!studentAssignmentValidation.valid) throw new Error(studentAssignmentValidation.message);
    const questionSetIndex = reattemptAssignment?.setIndex ?? studentAssignmentValidation.assignment?.setIndex ?? null;
    const questionsForAttempt = reattemptAssignment
        ? getQuestionSetIds(assessment, questionSetIndex)
        : assessment.usesMultiSetAssignment
            ? assessment.questionSets?.[questionSetIndex]?.questions || []
            : assessment.questions;
    if (assessment.usesMultiSetAssignment || reattemptAssignment) {
        const allowedIds = new Set((questionsForAttempt || []).map((id) => String(id?._id || id)));
        const answerIds = answers.map((answer) => answer.question.toString());
        if (answerIds.length !== allowedIds.size || answerIds.some((id) => !allowedIds.has(id))) {
            throw new Error(reattemptAssignment
                ? "Answers must contain exactly the questions in your assigned re-attempt set"
                : "Answers must contain exactly the questions in your assigned set");
        }
    }

    // Validate student is active
    const studentValidation = await validateStudentActive(studentId);
    if (!studentValidation.valid) {
        throw new Error(studentValidation.message);
    }

    // Validate no duplicate attempts
    const duplicateValidation = await validateNoDuplicateAttempt(studentId, assessmentId, reattemptAssignment?._id);
    if (!duplicateValidation.valid) {
        throw new Error(duplicateValidation.message);
    }

    // Validate answers format
    const questionsForValidation = questionsForAttempt;
    const answersValidation = validateAnswers(answers, questionsForValidation);
    if (!answersValidation.valid) {
        throw new Error(answersValidation.message);
    }

    // Verify server-side that student's attempt has not expired (based on student's currentAttempt)
    const student = await Student.findById(studentId);
    if (!student) throw new Error("Student not found");

    const currentAttemptMatches = student.currentAttempt?.assessmentId?.toString() === assessmentId.toString()
        && String(student.currentAttempt.reattemptAssignmentId || "") === String(reattemptAssignment?._id || "");
    if (currentAttemptMatches) {
        if (student.currentAttempt.dueAt && new Date() > new Date(student.currentAttempt.dueAt)) {
            // mark expired
            student.currentAttempt.status = 'expired';
            await student.save();
            throw new Error('Assessment time has expired');
        }
    }

    // Create and evaluate result
    const result = await createAssessmentResult(studentId, assessmentId, answers, timeTaken, {
        questionSetIndex,
        reattemptAssignmentId: reattemptAssignment?._id || null,
    });

    if (reattemptAssignment) {
        await ReattemptAssignment.updateOne({ _id: reattemptAssignment._id, active: true }, { $set: { active: false } });
        await AssessmentAttendanceRequest.updateMany(
            { _id: { $in: reattemptAssignment.requests }, student: studentId, active: { $ne: false } },
            { $set: { active: false, status: "Completed" } }
        );
    }

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
        if (s && s.currentAttempt && s.currentAttempt.assessmentId && s.currentAttempt.assessmentId.toString() === assessmentId.toString()
            && String(s.currentAttempt.reattemptAssignmentId || "") === String(reattemptAssignment?._id || "")) {
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
        .populate("assessment", "_id title assessmentType totalMarks passingMarks duration")
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
        .populate("assessment", "_id title description assessmentType totalMarks passingMarks duration")
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
