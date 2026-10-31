const Student = require("../models/Student");
const Assessment = require("../models/Assessment");
const AssessmentResult = require("../models/AssessmentResult");
const Roadmap = require("../models/Roadmap");
const Faculty = require("../models/Faculty");
const {
    calculatePlacementReadiness,
    getValidAssessmentResults
} = require("./readinessScoringService");
const { attachPlacementReadinessScores } = require("./readinessService");
const { getDepartmentQuery } = require("../utils/department");
const { getAssessmentAssignedStudentCount } = require("../utils/assessmentSetMetrics");

const buildDashboardSnapshot = (payload) => {
    const student = payload.student || {};
    const readiness = payload.readiness || {};
    const resumeSummary = payload.resumeAnalysis || {};
    const assessmentSummary = payload.assessmentSummary || {};
    const codingSummary = payload.codingSummary || {};
    const roadmap = payload.roadmap || {};
    const rawResumeScore = Object.prototype.hasOwnProperty.call(payload, "resumeScore")
        ? payload.resumeScore
        : student.resumeJDAnalysis?.atsScore ?? student.resumeScore ?? resumeSummary.resumeScore ?? resumeSummary.overallScore;
    const resumeScore = rawResumeScore === null || rawResumeScore === undefined || rawResumeScore === ""
        ? null
        : Number.isFinite(Number(rawResumeScore)) ? Number(rawResumeScore) : null;

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
            value: resumeScore === null ? "—" : `${Math.round(resumeScore)}%`,
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
            targetScore: readiness.targetScore,
            level: readiness.level || "Low",
            explanation: readiness.explanation || "",
            breakdown: readiness.factors || []
        },
        placementReadinessBreakdown: readiness.factors || [],
        resumeSummary: {
            resumeScore,
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
        skillPerformance: Array.isArray(payload.skillPerformance) ? payload.skillPerformance : [],
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

const getSkillCategory = (topic) => {
    const normalized = String(topic || "").trim();
    const lower = normalized.toLowerCase();
    if (/aptitude|reasoning|logical/.test(lower)) return "Aptitude";
    if (/dsa|data structure|algorithm/.test(lower)) return "DSA";
    if (/database|\bsql\b|mongodb|mysql|postgres/.test(lower)) return "Database";
    if (/web|react|javascript|typescript|css|html|frontend|backend/.test(lower)) return "Web Development";
    if (/machine learning|\bai\b|\bml\b/.test(lower)) return "AI/ML";
    if (/technical|network|operating system|system design/.test(lower)) return "Technical";
    return normalized;
};

const buildSkillPerformance = (assessmentResults) => {
    const categories = new Map();
    (assessmentResults || []).forEach((result) => {
        (Array.isArray(result.topicAnalysis) ? result.topicAnalysis : []).forEach((topic) => {
            if (!topic) return;
            const category = getSkillCategory(topic.topic);
            if (
                topic.accuracy === null
                || topic.accuracy === undefined
                || topic.accuracy === ""
                || topic.totalQuestions === null
                || topic.totalQuestions === undefined
                || topic.totalQuestions === ""
            ) return;
            const accuracy = Number(topic.accuracy);
            const totalQuestions = Number(topic.totalQuestions);
            if (!category || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100 || !Number.isFinite(totalQuestions) || totalQuestions <= 0) return;
            const entry = categories.get(category) || { category, weightedScore: 0, totalQuestions: 0 };
            entry.weightedScore += accuracy * totalQuestions;
            entry.totalQuestions += totalQuestions;
            categories.set(category, entry);
        });
    });

    return Array.from(categories.values())
        .map(({ category, weightedScore, totalQuestions }) => ({
            category,
            score: Math.round(weightedScore / totalQuestions),
            questionCount: totalQuestions
        }))
        .sort((left, right) => right.questionCount - left.questionCount)
        .slice(0, 6);
};

const buildDashboardPayload = async (studentId) => {
    const student = await Student.findById(studentId).select("name department year section skills cgpa placementReadinessScore readinessProfile resume resumeAnalysis resumeScore resumeJDAnalysis codingProfile");
    if (!student) {
        throw new Error("Student not found");
    }

    const [assessmentResults, roadmap] = await Promise.all([
        AssessmentResult.find({ student: studentId, completed: true })
            .select("percentage score totalMarks completed status expired strengths weaknesses recommendations submittedAt topicAnalysis")
            .populate("assessment", "title assessmentType")
            .sort({ submittedAt: -1 })
            .lean(),
        Roadmap.findOne({ student: studentId }).lean()
    ]);

    const resumeAnalysis = student.resumeAnalysis || {};
    const readiness = calculatePlacementReadiness(student, assessmentResults);
    const resumeScore = readiness.breakdown.resume.score;

    const latestAssessment = assessmentResults[0] || null;
    const validAssessmentResults = getValidAssessmentResults(assessmentResults);
    const assessmentSummary = {
        averageScore: readiness.breakdown.assessment.score ?? 0,
        totalAssessments: validAssessmentResults.length,
        completedAssessments: validAssessmentResults.length,
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
            section: student.section,
            resumeScore
        },
        resumeScore,
        readiness,
        resumeAnalysis,
        assessmentSummary,
        skillPerformance: buildSkillPerformance(assessmentResults),
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
            currentScore: baseDashboard.resumeSummary.resumeScore ?? null,
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
        .select("department name designation")
        .lean();

    if (!faculty) {
        throw new Error("Faculty not found");
    }

    const departmentQuery = getDepartmentQuery(faculty.department);
    const [departmentStudents, allAssessments] = await Promise.all([
        departmentQuery
            ? Student.find({ department: departmentQuery, isActive: true })
                .select("name studentId department placementReadinessScore readinessProfile profileCompleted initialAssessmentCompleted cgpa skills resume resumeAnalysis codingProfile")
                .sort({ name: 1 })
                .lean()
            : [],
        Assessment.find({ assignedFaculty: facultyId, isActive: true })
            .select("title assessmentType assignedStudents setAssignments questionSets department usesMultiSetAssignment status startDate endDate createdAt updatedAt isActive")
            .sort({ createdAt: -1 })
            .lean(),
    ]);
    const students = await attachPlacementReadinessScores(departmentStudents);
    const assessmentIds = allAssessments.map((assessment) => assessment._id);
    const activeAssessments = allAssessments;
    const assessmentResults = assessmentIds.length
        ? await AssessmentResult.find({ assessment: { $in: assessmentIds }, completed: true })
            .select("student assessment score percentage submittedAt createdAt strengths weaknesses topicAnalysis status expired")
            .populate("student", "name studentId department placementReadinessScore readinessProfile")
            .populate("assessment", "title")
            .sort({ submittedAt: -1, createdAt: -1 })
            .lean()
        : [];
    const readinessByStudent = new Map(students.map((student) => [student._id.toString(), student]));
    assessmentResults.forEach((result) => {
        const currentStudent = readinessByStudent.get(String(result.student?._id || result.student));
        if (currentStudent && result.student && typeof result.student === "object") {
            result.student.placementReadinessScore = currentStudent.placementReadinessScore;
            result.student.readinessProfile = currentStudent.readinessProfile;
        }
    });

    const studentReadinessDistribution = students.reduce((distribution, student) => {
        if (!student.profileCompleted || !student.initialAssessmentCompleted) {
            distribution["Not Started"] = (distribution["Not Started"] || 0) + 1;
            return distribution;
        }

        const level = student.readinessProfile.level;
        distribution[level] = (distribution[level] || 0) + 1;
        return distribution;
    }, { High: 0, Medium: 0, Low: 0, "Not Started": 0 });

    const resultsByAssessment = new Map();
    const studentResultsByStudent = new Map();
    for (const result of assessmentResults) {
        const assessmentId = String(result.assessment?._id || result.assessment);
        const assessmentBucket = resultsByAssessment.get(assessmentId) || [];
        assessmentBucket.push(result);
        resultsByAssessment.set(assessmentId, assessmentBucket);

        const studentId = String(result.student?._id || result.student);
        if (!studentId || studentId === "undefined") continue;
        const studentBucket = studentResultsByStudent.get(studentId) || [];
        studentBucket.push(result);
        studentResultsByStudent.set(studentId, studentBucket);
    }

    const validPercentage = (value) => (
        value !== null
        && value !== undefined
        && value !== ""
        && Number.isFinite(Number(value))
        && Number(value) >= 0
        && Number(value) <= 100
    );

    const assessmentStats = activeAssessments.map((assessment) => {
        const results = resultsByAssessment.get(assessment._id.toString()) || [];
        const percentages = results.filter((result) => validPercentage(result.percentage)).map((result) => Number(result.percentage));
        const participatingStudents = new Set(
            results
                .map((result) => String(result.student?._id || result.student))
                .filter((studentId) => studentId && studentId !== "undefined" && studentId !== "null")
        );
        const participatingCount = participatingStudents.size;
        const assignedCount = getAssessmentAssignedStudentCount(assessment);

        return {
            assessmentId: assessment._id,
            title: assessment.title,
            status: assessment.status,
            totalAttempts: results.length,
            participatingStudents: participatingCount,
            assignedCount,
            completionPercentage: assignedCount ? Math.min(100, round((participatingCount / assignedCount) * 100)) : null,
            averagePercentage: percentages.length
                ? round(percentages.reduce((sum, percentage) => sum + percentage, 0) / percentages.length)
                : null
        };
    });

    const validAssessmentPercentages = assessmentResults
        .filter((result) => validPercentage(result.percentage))
        .map((result) => Number(result.percentage));
    const averageAssessmentScore = validAssessmentPercentages.length
        ? round(validAssessmentPercentages.reduce((sum, percentage) => sum + percentage, 0) / validAssessmentPercentages.length)
        : null;

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

    const topPerformingStudents = Array.from(studentResultsByStudent.values())
        .map((results) => {
            const student = results[0]?.student || {};
            const percentages = results.filter((result) => validPercentage(result.percentage)).map((result) => Number(result.percentage));
            return {
                studentId: student.studentId || "",
                studentName: student.name || "",
                department: student.department || "",
                averagePercentage: percentages.length
                    ? round(percentages.reduce((sum, percentage) => sum + percentage, 0) / percentages.length)
                    : null,
                assessmentsAttempted: results.length,
                readinessLevel: student.readinessProfile?.level || "Low"
            };
        })
        .filter((student) => student.averagePercentage !== null)
        .sort((a, b) => b.averagePercentage - a.averagePercentage)
        .slice(0, 5);

    const attentionStudents = students.map((student) => {
        const resultBucket = studentResultsByStudent.get(student._id?.toString()) || [];
        const percentages = resultBucket.filter((result) => validPercentage(result.percentage)).map((result) => Number(result.percentage));
        const averagePercentage = percentages.length
            ? round(percentages.reduce((sum, percentage) => sum + percentage, 0) / percentages.length)
            : null;
        const readinessScore = Number(student.placementReadinessScore);
        const readinessAvailable = Boolean(student.readinessProfile?.lastCalculatedAt)
            || student.initialAssessmentCompleted
            || readinessScore > 0 && student.profileCompleted;
        const latestScoredResult = resultBucket.find((result) => validPercentage(result.percentage));
        const needsAttention = (readinessAvailable && readinessScore < 60)
            || (averagePercentage !== null && averagePercentage < 50);

        return {
            studentName: student.name || "",
            studentId: student.studentId || "",
            department: student.department || "",
            readinessScore: readinessAvailable && Number.isFinite(readinessScore) ? readinessScore : null,
            readinessLevel: student.readinessProfile?.level || "Low",
            averageAssessmentPercentage: averagePercentage,
            lastScore: latestScoredResult ? Number(latestScoredResult.percentage) : null,
            lastScoreSubmittedAt: latestScoredResult?.submittedAt || null,
            status: readinessAvailable && readinessScore < 60 ? "At Risk" : "Needs Practice",
            needsAttention
        };
    }).filter((student) => student.needsAttention)
        .sort((a, b) => (a.readinessScore ?? Infinity) - (b.readinessScore ?? Infinity))
        .slice(0, 10);

    const recentAssessments = activeAssessments.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    const recentAssessmentResults = assessmentResults.filter((result) => validPercentage(result.percentage)).slice(0, 5).map((result) => ({
        studentName: result.student?.name || "",
        studentId: result.student?.studentId || "",
        assessmentTitle: result.assessment?.title || "Assessment",
        percentage: round(result.percentage),
        score: result.score === null || result.score === undefined || result.score === "" ? null : round(result.score),
        submittedAt: result.submittedAt
    }));

    return {
        faculty: {
            name: faculty.name || "",
            department: faculty.department || "",
            designation: faculty.designation || ""
        },
        totalAssignedStudents: students.length,
        totalAssignedAssessments: activeAssessments.length,
        studentReadinessDistribution,
        assessmentCompletionStatistics: {
            totalAssessments: activeAssessments.length,
            completedResults: assessmentResults.length,
            overallAverageScore: averageAssessmentScore,
            assessmentStats
        },
        averageAssessmentScores: averageAssessmentScore,
        weakSkillsAnalysis,
        skillPerformance: buildSkillPerformance(assessmentResults),
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
        skillPerformance: facultyDashboard.skillPerformance,
        topPerformingStudents: facultyDashboard.topPerformingStudents,
        studentsNeedingAttention: facultyDashboard.studentsNeedingAttention,
        recentAssessments: facultyDashboard.recentAssessments,
        recentAssessmentResults: facultyDashboard.recentAssessmentResults
    };
};

const buildPlacementAnalytics = async () => {
    const [scoringStudents, totalResumes, codingProfilesComplete, totalRoadmaps] = await Promise.all([
        Student.find().select("department cgpa skills resume resumeAnalysis codingProfile readinessProfile").lean(),
        Student.countDocuments({ resume: { $exists: true, $ne: "" } }),
        Student.countDocuments({ "codingProfile.score": { $gt: 0 } }),
        Roadmap.countDocuments()
    ]);
    const students = await attachPlacementReadinessScores(scoringStudents);
    const totalStudents = students.length;
    const roadmapStats = await Roadmap.aggregate([
        { $group: { _id: null, averageCompletion: { $avg: "$progress.completionPercentage" }, completedRoadmaps: { $sum: { $cond: [{ $gte: ["$progress.completionPercentage", 75] }, 1, 0] } } } }
    ]);
    const departmentGroups = new Map();
    const readinessDistributionMap = { High: 0, Medium: 0, Low: 0 };
    students.forEach((student) => {
        readinessDistributionMap[student.readinessProfile.level] += 1;
        const department = student.department || "";
        const group = departmentGroups.get(department) || {
            department,
            studentCount: 0,
            readinessTotal: 0,
            cgpaTotal: 0,
            cgpaCount: 0
        };
        group.studentCount += 1;
        group.readinessTotal += student.placementReadinessScore;
        if (student.cgpa !== null && student.cgpa !== undefined && Number.isFinite(Number(student.cgpa))) {
            group.cgpaTotal += Number(student.cgpa);
            group.cgpaCount += 1;
        }
        departmentGroups.set(department, group);
    });
    const departmentStatistics = Array.from(departmentGroups.values()).map((group) => ({
        department: group.department,
        studentCount: group.studentCount,
        averageReadiness: round(group.readinessTotal / group.studentCount),
        averageCgpa: group.cgpaCount ? round(group.cgpaTotal / group.cgpaCount) : null
    }));

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
    buildSkillPerformance,
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
