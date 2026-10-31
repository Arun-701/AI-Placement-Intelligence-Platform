const Assessment = require("../models/Assessment");
const AssessmentResult = require("../models/AssessmentResult");
const Student = require("../models/Student");
const mongoose = require("mongoose");
const { successResponse, errorResponse } = require("../utils/response");
const { getAssessmentAssignedStudentCount } = require("../utils/assessmentSetMetrics");
const { attachPlacementReadinessScores } = require("../services/readinessService");

/**
 * GET /api/faculty/results
 * Get all assessment results for all assessments created/assigned by faculty
 */
const getAllResults = async (req, res) => {
    try {
        const facultyId = req.user.id;
        const { assessmentId, page = 1, limit = 20, sortBy = "submittedAt", order = -1 } = req.query;

        // Build query
        let query = {};

        if (assessmentId) {
            if (!mongoose.isValidObjectId(assessmentId)) {
                return errorResponse(res, { message: "Invalid assessment ID", status: 400 });
            }

            const assessment = await Assessment.findOne({
                _id: assessmentId,
                assignedFaculty: facultyId
            }).select("_id");

            if (!assessment) {
                return errorResponse(res, { message: "Assessment not found", status: 404 });
            }

            query.assessment = assessment._id;
        } else {
            // Get all assessments assigned to this faculty
            const facultyAssessments = await Assessment.find({
                assignedFaculty: facultyId
            }).select("_id");

            if (facultyAssessments.length === 0) {
                return successResponse(res, {
                    message: "No assessments found for this faculty",
                    data: {
                        total: 0,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        results: []
                    }
                });
            }

            query.assessment = { $in: facultyAssessments.map((a) => a._id) };
        }

        // Get total count
        const total = await AssessmentResult.countDocuments(query);

        // Get paginated results
        const results = await AssessmentResult.find(query)
            .populate("student", "name email studentId department year placementReadinessScore")
            .populate("assessment", "_id title assessmentType totalMarks duration")
            .select("_id score percentage submittedAt completed")
            .sort({ [sortBy]: parseInt(order) })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();
        const studentIds = [...new Set(results
            .filter((result) => result.student?._id)
            .map((result) => result.student._id.toString()))];
        const studentsForReadiness = studentIds.length > 0
            ? await Student.find({ _id: { $in: studentIds } })
                .select("cgpa skills resume resumeAnalysis codingProfile readinessProfile")
                .lean()
            : [];
        const readinessByStudent = new Map(
            (await attachPlacementReadinessScores(studentsForReadiness))
                .map((student) => [student._id.toString(), student.placementReadinessScore])
        );
        results.forEach((result) => {
            if (result.student?._id) {
                result.student.placementReadinessScore = readinessByStudent.get(result.student._id.toString()) ?? 0;
            }
        });

        return successResponse(res, {
            message: "Results fetched successfully",
            data: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit)),
                results
            }
        });
    } catch (error) {
        console.error(error);
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

/**
 * GET /api/faculty/results/:studentId
 * Get all assessment results for a specific student
 */
const getStudentResults = async (req, res) => {
    try {
        const facultyId = req.user.id;
        const { studentId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        // Verify student exists
        const student = await Student.findById(studentId).select("name email studentId department year");
        if (!student) {
            return errorResponse(res, { message: "Student not found", status: 404 });
        }

        // Get student's results only from assessments assigned by this faculty
        const facultyAssessments = await Assessment.find({
            assignedFaculty: facultyId
        }).select("_id");

        if (facultyAssessments.length === 0) {
            return successResponse(res, {
                message: "No assessments found for this faculty",
                data: {
                    student,
                    total: 0,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    results: []
                }
            });
        }

        const query = {
            student: studentId,
            assessment: { $in: facultyAssessments.map((a) => a._id) }
        };

        const total = await AssessmentResult.countDocuments(query);

        const results = await AssessmentResult.find(query)
            .populate("assessment", "_id title assessmentType totalMarks")
            .select("_id score percentage submittedAt completed strengths weaknesses recommendations")
            .sort({ submittedAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();

        return successResponse(res, {
            message: "Student results fetched successfully",
            data: {
                student,
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit)),
                results
            }
        });
    } catch (error) {
        console.error(error);
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

/**
 * GET /api/faculty/results/:studentId/:resultId
 * Get detailed result analysis for a student's assessment
 */
const getDetailedStudentResult = async (req, res) => {
    try {
        const facultyId = req.user.id;
        const { studentId, resultId } = req.params;

        // Verify result exists and belongs to the student
        const result = await AssessmentResult.findById(resultId)
            .populate("student", "name email studentId department year")
            .populate({
                path: "assessment",
                select: "_id title description assessmentType totalMarks duration assignedFaculty"
            })
            .populate({
                path: "answers.question",
                select: "_id title question questionType marks topic correctAnswer explanation"
            });

        if (!result) {
            return errorResponse(res, { message: "Result not found", status: 404 });
        }

        if (result.student._id.toString() !== studentId) {
            return errorResponse(res, { message: "Result does not belong to this student", status: 400 });
        }

        // Verify faculty has access to this assessment
        if (result.assessment.assignedFaculty.toString() !== facultyId) {
            return errorResponse(res, { message: "Unauthorized access", status: 403 });
        }

        // Prepare detailed response
        const answers = result.answers.map((answer) => ({
            questionId: answer.question._id,
            title: answer.question.title,
            question: answer.question.question,
            questionType: answer.question.questionType,
            marks: answer.question.marks,
            topic: answer.question.topic,
            studentAnswer: answer.selectedAnswer || "Not answered",
            correctAnswer: answer.question.correctAnswer,
            isCorrect: answer.isCorrect,
            marksObtained: answer.marksObtained,
            explanation: answer.question.explanation
        }));

        return successResponse(res, {
            message: "Result details fetched successfully",
            data: {
                assessment: result.assessment,
                student: result.student,
                score: result.score,
                totalMarks: result.totalMarks,
                percentage: result.percentage,
                submittedAt: result.submittedAt,
                completed: result.completed,
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
            }
        });
    } catch (error) {
        console.error(error);
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

/**
 * GET /api/faculty/dashboard/statistics
 * Get dashboard statistics for all assessments assigned to faculty
 */
const getDashboardStatistics = async (req, res) => {
    try {
        const facultyId = req.user.id;
        const { assessmentId } = req.query;

        // Get assessments
        let assessmentQuery = { assignedFaculty: facultyId };
        if (assessmentId) {
            assessmentQuery._id = assessmentId;
        }

        const assessments = await Assessment.find(assessmentQuery)
            .select("_id title totalMarks assignedStudents setAssignments");

        const assessmentIds = assessments.map((a) => a._id);

        // Aggregate statistics
        const aggregateStats = await AssessmentResult.aggregate([
            {
                $match: { assessment: { $in: assessmentIds }, completed: true }
            },
            {
                $group: {
                    _id: "$assessment",
                    totalAttempts: { $sum: 1 },
                    averageScore: { $avg: "$score" },
                    averagePercentage: { $avg: "$percentage" },
                    highestScore: { $max: "$score" },
                    lowestScore: { $min: "$score" },
                    highestPercentage: { $max: "$percentage" },
                    lowestPercentage: { $min: "$percentage" },
                    participatingStudents: { $addToSet: "$student" }
                }
            }
        ]);

        // Combine with assessment info
        const statistics = assessments.map((assessment) => {
            const stats = aggregateStats.find((s) => s._id.toString() === assessment._id.toString());
            const assignedCount = getAssessmentAssignedStudentCount(assessment);
            const participatingStudents = stats?.participatingStudents?.filter(Boolean).length || 0;

            return {
                assessmentId: assessment._id,
                title: assessment.title,
                assessmentTitle: assessment.title,
                totalMarks: assessment.totalMarks,
                totalAttempts: stats?.totalAttempts || 0,
                participatingStudents,
                assignedCount,
                completionPercentage: assignedCount
                    ? Math.min(100, Math.round((participatingStudents / assignedCount) * 100))
                    : null,
                averageScore: stats?.averageScore == null ? null : Math.round(stats.averageScore * 100) / 100,
                averagePercentage: stats?.averagePercentage == null ? null : Math.round(stats.averagePercentage),
                highestScore: stats?.highestScore ?? null,
                lowestScore: stats?.lowestScore ?? null,
                highestPercentage: stats?.highestPercentage ?? null,
                lowestPercentage: stats?.lowestPercentage ?? null
            };
        });

        // Overall statistics
        const allResults = await AssessmentResult.find({
            assessment: { $in: assessmentIds },
            completed: true
        }).select("score percentage").lean();
        const scoredResults = allResults.filter((result) =>
            result.score !== null && result.score !== undefined && result.score !== "" && Number.isFinite(Number(result.score))
        );
        const percentageResults = allResults.filter((result) =>
            result.percentage !== null
            && result.percentage !== undefined
            && result.percentage !== ""
            && Number.isFinite(Number(result.percentage))
            && Number(result.percentage) >= 0
            && Number(result.percentage) <= 100
        );

        const overallStats = {
            totalResults: allResults.length,
            averageScoreAllAssessments: scoredResults.length
                ? Math.round((scoredResults.reduce((sum, result) => sum + Number(result.score), 0) / scoredResults.length) * 100) / 100
                : null,
            averagePercentageAllAssessments: percentageResults.length
                ? Math.round(percentageResults.reduce((sum, result) => sum + Number(result.percentage), 0) / percentageResults.length)
                : null,
            highestScoreAllAssessments: scoredResults.length ? Math.max(...scoredResults.map((result) => Number(result.score))) : null,
            lowestScoreAllAssessments: scoredResults.length ? Math.min(...scoredResults.map((result) => Number(result.score))) : null
        };

        // Top students
        const topStudents = await AssessmentResult.aggregate([
            {
                $match: {
                    assessment: { $in: assessmentIds },
                    completed: true,
                    percentage: { $type: "number", $gte: 0, $lte: 100 }
                }
            },
            {
                $group: {
                    _id: "$student",
                    averagePercentage: { $avg: "$percentage" },
                    assessmentsAttempted: { $sum: 1 }
                }
            },
            {
                $sort: { averagePercentage: -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: "students",
                    localField: "_id",
                    foreignField: "_id",
                    as: "studentInfo"
                }
            },
            {
                $unwind: "$studentInfo"
            },
            {
                $project: {
                    _id: 1,
                    studentName: "$studentInfo.name",
                    studentId: "$studentInfo.studentId",
                    averagePercentage: 1,
                    assessmentsAttempted: 1
                }
            }
        ]);

        return successResponse(res, {
            message: "Dashboard statistics fetched successfully",
            data: {
                overallStatistics: overallStats,
                assessmentStatistics: statistics,
                topStudents
            }
        });
    } catch (error) {
        console.error(error);
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

module.exports = {
    getAllResults,
    getStudentResults,
    getDetailedStudentResult,
    getDashboardStatistics
};
