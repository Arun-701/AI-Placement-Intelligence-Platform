const Student = require("../models/Student");
const Assessment = require("../models/Assessment");
const AssessmentResult = require("../models/AssessmentResult");
const Roadmap = require("../models/Roadmap");
const Faculty = require("../models/Faculty");
const { analyzeResume } = require("./resumeAnalysisService");
const { calculatePlacementReadiness } = require("./readinessScoringService");

const buildDashboardSnapshot = (payload) => {
    const student = payload.student || {};
    const readiness = payload.readiness || {};
    const resumeSummary = payload.resumeAnalysis || {};
    const assessmentSummary = payload.assessmentSummary || {};
    const codingSummary = payload.codingSummary || {};
    const roadmap = payload.roadmap || {};

    const skillGapSummary = Array.isArray(roadmap.skillGaps) && roadmap.skillGaps.length > 0
        ? roadmap.skillGaps.map((gap) => ({
            domain: gap.domain || "General",
            title: gap.title || "Skill Gap",
            severity: gap.severity || "Medium",
            priority: gap.priority || "Medium",
            evidence: Array.isArray(gap.evidence) ? gap.evidence : []
        }))
        : [];

    const recommendedNextActions = [];
    if (readiness.recommendedActions && readiness.recommendedActions.length > 0) {
        recommendedNextActions.push(...readiness.recommendedActions);
    }
    if (Array.isArray(resumeSummary.improvements) && resumeSummary.improvements.length > 0) {
        recommendedNextActions.push(...resumeSummary.improvements.slice(0, 2));
    }
    if (Array.isArray(assessmentSummary.weaknesses) && assessmentSummary.weaknesses.length > 0) {
        recommendedNextActions.push(`Practice ${assessmentSummary.weaknesses[0]} fundamentals`);
    }
    if (codingSummary.score < 70) {
        recommendedNextActions.push("Increase coding practice volume and accuracy");
    }

    const dashboardKpiCards = [
        {
            title: "Overall Readiness",
            value: `${Math.round(readiness.score || 0)}%`,
            description: readiness.level || "Low"
        },
        {
            title: "Resume Score",
            value: `${Math.round(resumeSummary.resumeScore || 0)}%`,
            description: "Resume quality"
        },
        {
            title: "Coding Score",
            value: `${Math.round(codingSummary.score || 0)}%`,
            description: codingSummary.level || "Low"
        },
        {
            title: "Assessment Performance",
            value: `${Math.round(assessmentSummary.averageScore || 0)}%`,
            description: `${assessmentSummary.completedAssessments || 0} completed`
        },
        {
            title: "Roadmap Progress",
            value: `${Math.round(roadmap.progress?.completionPercentage || 0)}%`,
            description: `${roadmap.progress?.completedItems || 0} completed`
        }
    ];

    const aiInsightSummary = [
        readiness.explanation || "Placement readiness is being tracked consistently.",
        resumeSummary.summary || "Resume profile is available.",
        codingSummary.explanation || "Coding profile is available.",
        roadmap.summary || "Roadmap is available."
    ].filter(Boolean).join(" ");

    return {
        student: {
            name: student.name || "",
            department: student.department || "",
            year: student.year || "",
            section: student.section || ""
        },
        overallPlacementReadiness: {
            score: readiness.score || 0,
            level: readiness.level || "Low",
            explanation: readiness.explanation || "",
            breakdown: readiness.factors || []
        },
        placementReadinessBreakdown: readiness.factors || [],
        resumeSummary: {
            resumeScore: resumeSummary.resumeScore || 0,
            summary: resumeSummary.summary || "",
            strengths: Array.isArray(resumeSummary.strengths) ? resumeSummary.strengths : [],
            missingSkills: Array.isArray(resumeSummary.missingSkills) ? resumeSummary.missingSkills : [],
            improvements: Array.isArray(resumeSummary.improvements) ? resumeSummary.improvements : []
        },
        assessmentSummary: {
            averageScore: assessmentSummary.averageScore || 0,
            totalAssessments: assessmentSummary.totalAssessments || 0,
            completedAssessments: assessmentSummary.completedAssessments || 0,
            latestAssessment: assessmentSummary.latestAssessment || null,
            strengths: Array.isArray(assessmentSummary.strengths) ? assessmentSummary.strengths : [],
            weaknesses: Array.isArray(assessmentSummary.weaknesses) ? assessmentSummary.weaknesses : []
        },
        codingSummary: {
            score: codingSummary.score || 0,
            level: codingSummary.level || "Low",
            explanation: codingSummary.explanation || "",
            totalProblemsSolved: codingSummary.totalProblemsSolved || 0,
            easySolved: codingSummary.easySolved || 0,
            mediumSolved: codingSummary.mediumSolved || 0,
            hardSolved: codingSummary.hardSolved || 0,
            contestsParticipated: codingSummary.contestsParticipated || 0
        },
        learningRoadmapSummary: {
            careerGoal: roadmap.careerGoal || "General Software Development",
            progress: roadmap.progress || {
                completedItems: 0,
                inProgressItems: 0,
                pendingItems: 0,
                completionPercentage: 0
            },
            roadmapItems: Array.isArray(roadmap.roadmapItems) ? roadmap.roadmapItems : [],
            recommendations: roadmap.recommendations || {
                courses: [],
                practiceTopics: [],
                learningResources: [],
                miniProjects: []
            }
        },
        careerGoal: roadmap.careerGoal || "General Software Development",
        skillGapSummary,
        recommendedNextActions: Array.from(new Set(recommendedNextActions)).slice(0, 6),
        aiInsightSummary,
        dashboardKpiCards
    };
};

const buildDashboardPayload = async (studentId) => {
    const student = await Student.findById(studentId).select("name department year section skills cgpa placementReadinessScore readinessProfile resume codingProfile");
    if (!student) {
        throw new Error("Student not found");
    }

    const [assessmentResults, roadmap] = await Promise.all([
        AssessmentResult.find({ student: studentId, completed: true })
            .select("percentage score strengths weaknesses recommendations submittedAt")
            .populate("assessment", "title")
            .sort({ submittedAt: -1 })
            .lean(),
        Roadmap.findOne({ student: studentId }).lean()
    ]);

    const resumeAnalysis = student.resume
        ? await analyzeResume(student.resume)
        : {
            summary: "",
            skills: [],
            strengths: [],
            missingSkills: [],
            improvements: [],
            resumeScore: 0,
        };

    const readiness = calculatePlacementReadiness(student, resumeAnalysis, assessmentResults);

    const latestAssessment = assessmentResults[0] || null;
    const assessmentSummary = {
        averageScore: assessmentResults.length > 0
            ? Number((assessmentResults.reduce((sum, result) => sum + Number(result.percentage || 0), 0) / assessmentResults.length).toFixed(2))
            : 0,
        totalAssessments: assessmentResults.length,
        completedAssessments: assessmentResults.length,
        latestAssessment: latestAssessment ? {
            title: latestAssessment.assessment?.title || "Assessment",
            score: latestAssessment.score || 0,
            percentage: latestAssessment.percentage || 0,
            submittedAt: latestAssessment.submittedAt || null
        } : null,
        strengths: latestAssessment?.strengths || [],
        weaknesses: latestAssessment?.weaknesses || []
    };

    const codingSummary = {
        score: student.codingProfile?.score || 0,
        level: student.codingProfile?.level || "Low",
        explanation: student.codingProfile?.explanation || "",
        totalProblemsSolved: student.codingProfile?.totalProblemsSolved || 0,
        easySolved: student.codingProfile?.easySolved || 0,
        mediumSolved: student.codingProfile?.mediumSolved || 0,
        hardSolved: student.codingProfile?.hardSolved || 0,
        contestsParticipated: student.codingProfile?.contestsParticipated || 0
    };

    const payload = {
        student: {
            name: student.name,
            department: student.department,
            year: student.year,
            section: student.section
        },
        readiness,
        resumeAnalysis,
        assessmentSummary,
        codingSummary,
        roadmap: roadmap || {
            careerGoal: "General Software Development",
            progress: {
                completedItems: 0,
                inProgressItems: 0,
                pendingItems: 0,
                completionPercentage: 0
            },
            roadmapItems: [],
            recommendations: {
                courses: [],
                practiceTopics: [],
                learningResources: [],
                miniProjects: []
            },
            skillGaps: []
        },
    };

    return buildDashboardSnapshot(payload);
};

const round = (value, precision = 2) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? Number(numberValue.toFixed(precision)) : 0;
};

const buildAssessmentTrend = (results) => {
    const sorted = (results || []).slice().sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

    return sorted.slice(-6).map((result) => ({
        date: result.submittedAt ? new Date(result.submittedAt).toISOString().split("T")[0] : "",
        title: result.assessment?.title || "Assessment",
        score: round(result.score || 0),
        percentage: round(result.percentage || 0)
    }));
};

const buildTimeframeSummary = (results, days) => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const windowItems = (results || []).filter((result) => result.submittedAt && new Date(result.submittedAt) >= cutoff);
    const completed = windowItems.length;
    const averagePercentage = completed > 0
        ? round(windowItems.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / completed)
        : 0;
    const latestActivity = windowItems.slice().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0] || null;

    return {
        completedAssessments: completed,
        averagePercentage,
        latestActivity: latestActivity
            ? {
                title: latestActivity.assessment?.title || "Assessment",
                percentage: round(latestActivity.percentage || 0),
                submittedAt: latestActivity.submittedAt
            }
            : null
    };
};

const buildSkillGapAnalytics = (resumeAnalysis, roadmap) => ({
    totalSkillGaps: Array.isArray(roadmap?.skillGaps) ? roadmap.skillGaps.length : 0,
    missingSkills: Array.isArray(resumeAnalysis?.missingSkills) ? resumeAnalysis.missingSkills : [],
    roadmapSkillGaps: Array.isArray(roadmap?.skillGaps) ? roadmap.skillGaps : [],
    improvementRecommendations: Array.isArray(resumeAnalysis?.improvements) ? resumeAnalysis.improvements.slice(0, 5) : []
});

const buildRecentActivities = (assessmentResults, roadmap) => {
    const assessmentActivities = (assessmentResults || []).slice().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).slice(0, 5)
        .map((result) => ({
            type: "Assessment",
            title: result.assessment?.title || "Assessment Submitted",
            details: `Score: ${round(result.percentage || 0)}%`,
            date: result.submittedAt
        }));

    const roadmapActivity = roadmap && roadmap.updatedAt
        ? [{
            type: "Roadmap",
            title: "Roadmap updated",
            details: `Progress ${roadmap.progress?.completionPercentage || 0}%`,
            date: roadmap.updatedAt
        }]
        : [];

    return [...assessmentActivities, ...roadmapActivity]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 6);
};

const buildCodingProfileStatistics = (codingSummary) => ({
    score: codingSummary.score || 0,
    level: codingSummary.level || "Low",
    explanation: codingSummary.explanation || "",
    totalProblemsSolved: codingSummary.totalProblemsSolved || 0,
    easySolved: codingSummary.easySolved || 0,
    mediumSolved: codingSummary.mediumSolved || 0,
    hardSolved: codingSummary.hardSolved || 0,
    contestsParticipated: codingSummary.contestsParticipated || 0
});

const buildStudentDashboard = async (studentId) => {
    const baseDashboard = await buildDashboardPayload(studentId);
    const assessmentResults = await AssessmentResult.find({ student: studentId, completed: true })
        .select("percentage score submittedAt assessment weaknesses strengths")
        .populate("assessment", "title")
        .sort({ submittedAt: -1 })
        .lean();

    return {
        ...baseDashboard,
        assessmentPerformanceTrend: buildAssessmentTrend(assessmentResults),
        codingProfileStatistics: buildCodingProfileStatistics(baseDashboard.codingSummary),
        resumeScoreAnalytics: {
            currentScore: baseDashboard.resumeSummary.resumeScore || 0,
            missingSkills: baseDashboard.resumeSummary.missingSkills || [],
            improvementSuggestions: baseDashboard.resumeSummary.improvements || []
        },
        skillGapAnalytics: buildSkillGapAnalytics(baseDashboard.resumeSummary, baseDashboard.learningRoadmapSummary),
        roadmapProgress: baseDashboard.learningRoadmapSummary.progress,
        weeklyProgressSummary: buildTimeframeSummary(assessmentResults, 7),
        monthlyProgressSummary: buildTimeframeSummary(assessmentResults, 30),
        recentActivities: buildRecentActivities(assessmentResults, baseDashboard.learningRoadmapSummary)
    };
};

const buildStudentAnalytics = async (studentId) => {
    const studentDashboard = await buildStudentDashboard(studentId);

    return {
        studentOverview: studentDashboard.student,
        placementReadiness: studentDashboard.overallPlacementReadiness,
        assessmentPerformanceTrend: studentDashboard.assessmentPerformanceTrend,
        codingProfileStatistics: studentDashboard.codingProfileStatistics,
        resumeScoreAnalytics: studentDashboard.resumeScoreAnalytics,
        skillGapAnalytics: studentDashboard.skillGapAnalytics,
        roadmapProgress: studentDashboard.roadmapProgress,
        weeklyProgressSummary: studentDashboard.weeklyProgressSummary,
        monthlyProgressSummary: studentDashboard.monthlyProgressSummary,
        recentActivities: studentDashboard.recentActivities
    };
};

const buildStudentReport = async (studentId) => {
    const studentDashboard = await buildStudentDashboard(studentId);

    return {
        student: studentDashboard.student,
        placementReadiness: studentDashboard.overallPlacementReadiness,
        assessmentPerformance: studentDashboard.assessmentSummary,
        codingProfile: studentDashboard.codingSummary,
        resumeSummary: studentDashboard.resumeSummary,
        roadmapProgress: studentDashboard.roadmapProgress,
        skillGaps: studentDashboard.skillGapAnalytics,
        recentActivities: studentDashboard.recentActivities
    };
};

const buildFacultyDashboard = async (facultyId) => {
    const faculty = await Faculty.findById(facultyId)
        .select("assignedStudents assignedAssessments department name designation")
        .lean();

    if (!faculty) {
        throw new Error("Faculty not found");
    }

    const assignedStudentIds = Array.isArray(faculty.assignedStudents) ? faculty.assignedStudents : [];
    const assignedAssessmentIds = Array.isArray(faculty.assignedAssessments) ? faculty.assignedAssessments : [];

    const [students, assessments, assessmentResults] = await Promise.all([
        Student.find({ _id: { $in: assignedStudentIds } })
            .select("name studentId department placementReadinessScore readinessProfile")
            .lean(),
        Assessment.find({ assignedFaculty: facultyId })
            .select("title assignedStudents status startDate endDate createdAt updatedAt")
            .lean(),
        AssessmentResult.find({ assessment: { $in: assignedAssessmentIds }, completed: true })
            .populate("student", "name studentId department placementReadinessScore readinessProfile")
            .populate("assessment", "title")
            .sort({ submittedAt: -1 })
            .lean()
    ]);

    const studentReadinessDistribution = students.reduce((distribution, student) => {
        const level = student.readinessProfile?.level || (student.placementReadinessScore >= 80 ? "High" : student.placementReadinessScore >= 60 ? "Medium" : "Low");
        distribution[level] = (distribution[level] || 0) + 1;
        return distribution;
    }, {});

    const assessmentStats = assessments.map((assessment) => {
        const results = assessmentResults.filter((result) => result.assessment?._id?.toString() === assessment._id.toString());
        const totalAttempts = results.length;
        const averagePercentage = totalAttempts > 0
            ? round(results.reduce((sum, r) => sum + Number(r.percentage || 0), 0) / totalAttempts)
            : 0;
        const completionPercentage = assessment.assignedStudents && assessment.assignedStudents.length > 0
            ? round((totalAttempts / assessment.assignedStudents.length) * 100)
            : 0;

        return {
            assessmentId: assessment._id,
            title: assessment.title,
            status: assessment.status,
            totalAttempts,
            completionPercentage,
            averagePercentage
        };
    });

    const averageAssessmentScore = assessmentResults.length > 0
        ? round(assessmentResults.reduce((sum, result) => sum + Number(result.percentage || 0), 0) / assessmentResults.length)
        : 0;

    const weakSkillCounts = assessmentResults.reduce((counts, result) => {
        (Array.isArray(result.weaknesses) ? result.weaknesses : []).forEach((weakness) => {
            if (weakness) {
                counts[weakness] = (counts[weakness] || 0) + 1;
            }
        });
        return counts;
    }, {});

    const weakSkillsAnalysis = Object.entries(weakSkillCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count }));

    const studentResultsByStudent = assessmentResults.reduce((map, result) => {
        const studentId = result.student?._id?.toString();
        if (!studentId) return map;
        if (!map[studentId]) {
            map[studentId] = { student: result.student, results: [] };
        }
        map[studentId].results.push(result);
        return map;
    }, {});

    const topPerformingStudents = Object.values(studentResultsByStudent)
        .map(({ student, results }) => ({
            studentId: student.studentId || "",
            studentName: student.name || "",
            department: student.department || "",
            averagePercentage: round(results.reduce((sum, r) => sum + Number(r.percentage || 0), 0) / results.length),
            assessmentsAttempted: results.length,
            readinessLevel: student.readinessProfile?.level || "Low"
        }))
        .sort((a, b) => b.averagePercentage - a.averagePercentage)
        .slice(0, 5);

    const attentionStudents = students.map((student) => {
        const resultBucket = studentResultsByStudent[student._id?.toString()];
        const averagePercentage = resultBucket && resultBucket.results.length > 0
            ? round(resultBucket.results.reduce((sum, r) => sum + Number(r.percentage || 0), 0) / resultBucket.results.length)
            : 0;

        return {
            studentName: student.name || "",
            studentId: student.studentId || "",
            department: student.department || "",
            readinessScore: student.placementReadinessScore || 0,
            readinessLevel: student.readinessProfile?.level || "Low",
            averageAssessmentPercentage: averagePercentage,
            needsAttention: student.placementReadinessScore < 60 || averagePercentage < 50
        };
    }).filter((student) => student.needsAttention)
        .sort((a, b) => a.readinessScore - b.readinessScore)
        .slice(0, 10);

    const recentAssessments = assessments.slice().sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 5);
    const recentAssessmentResults = assessmentResults.slice(0, 5).map((result) => ({
        studentName: result.student?.name || "",
        studentId: result.student?.studentId || "",
        assessmentTitle: result.assessment?.title || "Assessment",
        percentage: round(result.percentage || 0),
        score: round(result.score || 0),
        submittedAt: result.submittedAt
    }));

    return {
        faculty: {
            name: faculty.name || "",
            department: faculty.department || "",
            designation: faculty.designation || ""
        },
        totalAssignedStudents: assignedStudentIds.length,
        totalAssignedAssessments: assignedAssessmentIds.length,
        studentReadinessDistribution,
        assessmentCompletionStatistics: {
            totalAssessments: assessments.length,
            completedResults: assessmentResults.length,
            overallAverageScore: averageAssessmentScore,
            assessmentStats
        },
        averageAssessmentScores: averageAssessmentScore,
        weakSkillsAnalysis,
        topPerformingStudents,
        studentsNeedingAttention: attentionStudents,
        recentAssessments,
        recentAssessmentResults
    };
};

const buildFacultyAnalytics = async (facultyId) => {
    const facultyDashboard = await buildFacultyDashboard(facultyId);

    return {
        faculty: facultyDashboard.faculty,
        totalAssignedStudents: facultyDashboard.totalAssignedStudents,
        totalAssignedAssessments: facultyDashboard.totalAssignedAssessments,
        studentReadinessDistribution: facultyDashboard.studentReadinessDistribution,
        assessmentCompletionStatistics: facultyDashboard.assessmentCompletionStatistics,
        averageAssessmentScores: facultyDashboard.averageAssessmentScores,
        weakSkillsAnalysis: facultyDashboard.weakSkillsAnalysis,
        topPerformingStudents: facultyDashboard.topPerformingStudents,
        studentsNeedingAttention: facultyDashboard.studentsNeedingAttention,
        recentAssessments: facultyDashboard.recentAssessments,
        recentAssessmentResults: facultyDashboard.recentAssessmentResults
    };
};

const buildPlacementAnalytics = async () => {
    const totalStudents = await Student.countDocuments();
    const totalResumes = await Student.countDocuments({ resume: { $exists: true, $ne: "" } });
    const codingProfilesComplete = await Student.countDocuments({ "codingProfile.score": { $gt: 0 } });
    const totalRoadmaps = await Roadmap.countDocuments();
    const roadmapStats = await Roadmap.aggregate([
        { $group: { _id: null, averageCompletion: { $avg: "$progress.completionPercentage" }, completedRoadmaps: { $sum: { $cond: [{ $gte: ["$progress.completionPercentage", 75] }, 1, 0] } } } }
    ]);
    const departmentStatistics = await Student.aggregate([
        { $group: { _id: "$department", studentCount: { $sum: 1 }, averageReadiness: { $avg: "$placementReadinessScore" }, averageCgpa: { $avg: "$cgpa" } } },
        { $project: { department: "$_id", studentCount: 1, averageReadiness: { $round: ["$averageReadiness", 2] }, averageCgpa: { $round: ["$averageCgpa", 2] }, _id: 0 } }
    ]);

    const readinessDistribution = await Student.aggregate([
        { $project: { readinessLevel: { $switch: { branches: [ { case: { $gte: ["$placementReadinessScore", 80] }, then: "High" }, { case: { $gte: ["$placementReadinessScore", 60] }, then: "Medium" } ], default: "Low" } } } },
        { $group: { _id: "$readinessLevel", count: { $sum: 1 } } }
    ]);

    const readinessDistributionMap = readinessDistribution.reduce((map, entry) => {
        map[entry._id] = entry.count;
        return map;
    }, {});

    const assignedCounts = await Assessment.aggregate([
        { $project: { assignedCount: { $size: { $ifNull: ["$assignedStudents", []] } } } },
        { $group: { _id: null, totalAssigned: { $sum: "$assignedCount" } } }
    ]);
    const totalAssignedCount = assignedCounts[0]?.totalAssigned || 0;
    const totalAssessmentResults = await AssessmentResult.countDocuments({ completed: true });
    const assessmentCompletionPercentage = totalAssignedCount > 0
        ? round((totalAssessmentResults / totalAssignedCount) * 100)
        : 0;

    return {
        departmentStatistics,
        placementReadinessDistribution: {
            High: readinessDistributionMap.High || 0,
            Medium: readinessDistributionMap.Medium || 0,
            Low: readinessDistributionMap.Low || 0
        },
        assessmentCompletionPercentage,
        resumeUploadStatistics: {
            totalStudents,
            uploaded: totalResumes,
            notUploaded: Math.max(0, totalStudents - totalResumes)
        },
        codingProfileCompletionStatistics: {
            totalStudents,
            completedCodingProfiles: codingProfilesComplete,
            incompleteCodingProfiles: Math.max(0, totalStudents - codingProfilesComplete)
        },
        roadmapCompletionStatistics: {
            totalRoadmaps,
            averageCompletion: round(roadmapStats[0]?.averageCompletion || 0),
            completedRoadmaps: roadmapStats[0]?.completedRoadmaps || 0
        }
    };
};

const buildFacultyReport = async (facultyId) => {
    const facultyDashboard = await buildFacultyDashboard(facultyId);

    return {
        faculty: facultyDashboard.faculty,
        totalAssignedStudents: facultyDashboard.totalAssignedStudents,
        totalAssignedAssessments: facultyDashboard.totalAssignedAssessments,
        averageAssessmentScores: facultyDashboard.averageAssessmentScores,
        assessmentCompletionStatistics: facultyDashboard.assessmentCompletionStatistics,
        readinessDistribution: facultyDashboard.studentReadinessDistribution,
        weakSkillsAnalysis: facultyDashboard.weakSkillsAnalysis,
        topPerformingStudents: facultyDashboard.topPerformingStudents,
        studentsNeedingAttention: facultyDashboard.studentsNeedingAttention
    };
};

const buildAssessmentReport = async (facultyId) => {
    const facultyDashboard = await buildFacultyDashboard(facultyId);

    return {
        assessmentCompletionStatistics: facultyDashboard.assessmentCompletionStatistics,
        recentAssessmentResults: facultyDashboard.recentAssessmentResults,
        topPerformingStudents: facultyDashboard.topPerformingStudents
    };
};

module.exports = {
    buildDashboardSnapshot,
    buildDashboardPayload,
    buildStudentDashboard,
    buildStudentAnalytics,
    buildStudentReport,
    buildFacultyDashboard,
    buildFacultyAnalytics,
    buildFacultyReport,
    buildAssessmentReport,
    buildPlacementAnalytics
};
