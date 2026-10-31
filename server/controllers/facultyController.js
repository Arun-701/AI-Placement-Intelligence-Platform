const Faculty = require("../models/Faculty");
const Student = require("../models/Student");
const QuestionBank = require("../models/QuestionBank");
const Assessment = require("../models/Assessment");
const AssessmentResult = require("../models/AssessmentResult");
const { successResponse, errorResponse } = require("../utils/response");
const { getDepartmentQuery } = require("../utils/department");
const { attachPlacementReadinessScores } = require("../services/readinessService");

const getProfile = async (req, res) => {
    try {
        const faculty = await Faculty.findById(req.user.id).select("-password");

        if (!faculty) {
            return errorResponse(res, { message: "Faculty not found", status: 404 });
        }

        return successResponse(res, { message: "Faculty profile fetched successfully", data: faculty });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const getAssignedStudents = async (req, res) => {
    try {
        const faculty = await Faculty.findById(req.user.id).select("department assignedStudents").lean();

        if (!faculty) {
            return errorResponse(res, { message: "Faculty not found", status: 404 });
        }

        const department = String(faculty.department || "").trim().replace(/\s+/g, " ");
        const assignedStudentIds = faculty.assignedStudents || [];
        const assignedStudents = department && assignedStudentIds.length
            ? await Student.find({
                _id: { $in: assignedStudentIds },
                department: getDepartmentQuery(department),
                isActive: true
            })
                .select("name studentId department year section cgpa skills resume resumeAnalysis codingProfile readinessProfile placementReadinessScore")
                .sort({ name: 1 })
                .lean()
            : [];
        const students = await attachPlacementReadinessScores(assignedStudents);

        return successResponse(res, {
            message: "Assigned students fetched successfully",
            data: { department, students }
        });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const getAssignedAssessments = async (req, res) => {
    try {
        const faculty = await Faculty.findById(req.user.id).populate(
            "assignedAssessments",
            "title assessmentType totalMarks duration status"
        );

        if (!faculty) {
            return errorResponse(res, { message: "Faculty not found", status: 404 });
        }

        return successResponse(res, { message: "Assigned assessments fetched successfully", data: faculty.assignedAssessments });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const getDashboard = async (req, res) => {
    try {
        const faculty = await Faculty.findById(req.user.id).select(
            "name department designation assignedStudents"
        );

        if (!faculty) {
            return errorResponse(res, { message: "Faculty not found", status: 404 });
        }

        const [
            totalAssignedStudents,
            totalQuestionsCreated,
            totalAssessmentsCreated,
            assessmentResultCount,
            recentAssessments
        ] = await Promise.all([
            Student.countDocuments({ _id: { $in: faculty.assignedStudents } }),
            QuestionBank.countDocuments({ createdBy: faculty._id }),
            Assessment.countDocuments({ assignedFaculty: faculty._id }),
            AssessmentResult.aggregate([
                {
                    $lookup: {
                        from: Assessment.collection.name,
                        localField: "assessment",
                        foreignField: "_id",
                        as: "assessment"
                    }
                },
                { $unwind: "$assessment" },
                {
                    $match: {
                        "assessment.assignedFaculty": faculty._id,
                        completed: true
                    }
                },
                { $count: "total" }
            ]),
            Assessment.find({ assignedFaculty: faculty._id })
                .select("title assessmentType totalMarks duration status createdAt")
                .sort({ createdAt: -1 })
                .limit(5)
                .lean()
        ]);

        return successResponse(res, { message: "Faculty dashboard fetched successfully", data: {
            faculty: {
                name: faculty.name,
                department: faculty.department,
                designation: faculty.designation
            },
            statistics: {
                totalAssignedStudents,
                totalQuestionsCreated,
                totalAssessmentsCreated,
                totalAssessmentResults: assessmentResultCount.length > 0
                    ? assessmentResultCount[0].total
                    : 0
            },
            recentAssessments
        } });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

module.exports = {
    getProfile,
    getAssignedStudents,
    getAssignedAssessments,
    getDashboard
};
