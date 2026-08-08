const Student = require("../models/Student");
const AssessmentResult = require("../models/AssessmentResult");
const Roadmap = require("../models/Roadmap");
const { analyzeResume } = require("./resumeAnalysisService");
const { calculateCodingSkillScore } = require("./codingProfileService");

const normalizeGoal = (goal) => {
    if (typeof goal !== "string") {
        return "General Software Development";
    }

    const trimmed = goal.trim();
    return trimmed || "General Software Development";
};

const normalizeStatus = (status) => {
    if (status === "In Progress" || status === "Completed" || status === "Pending") {
        return status;
    }
    return "Pending";
};

const getAssessmentSignals = async (studentId) => {
    const results = await AssessmentResult.find({ student: studentId, completed: true })
        .select("strengths weaknesses topicAnalysis percentage")
        .lean();

    const weaknesses = [];
    const topics = [];

    results.forEach((result) => {
        if (Array.isArray(result.weaknesses)) {
            result.weaknesses.forEach((weakness) => weaknesses.push(weakness));
        }
        if (Array.isArray(result.topicAnalysis)) {
            result.topicAnalysis.forEach((topic) => topics.push(topic));
        }
    });

    return {
        results,
        weaknesses,
        topics,
    };
};

const buildSkillGaps = (student, resumeAnalysis, codingProfile, assessmentSignals, goal) => {
    const gaps = [];
    const goalLower = goal.toLowerCase();

    const addGap = (domain, title, severity, evidence) => {
        gaps.push({ domain, title, severity, priority: severity, evidence });
    };

    if (Array.isArray(assessmentSignals.weaknesses) && assessmentSignals.weaknesses.length > 0) {
        addGap("Assessment", "Weak assessment topics", "High", assessmentSignals.weaknesses.slice(0, 5));
    }

    if (Array.isArray(resumeAnalysis?.missingSkills) && resumeAnalysis.missingSkills.length > 0) {
        addGap("Resume", "Resume skill gaps", "Medium", resumeAnalysis.missingSkills.slice(0, 5));
    }

    if (codingProfile?.score < 60) {
        addGap("Coding", "Low coding profile performance", "High", ["Improve coding problem-solving and accuracy"]);
    }

    if (goalLower.includes("data")) {
        addGap("Domain", "Analytics and data handling", "Medium", ["Strengthen SQL and data interpretation skills"]);
    } else if (goalLower.includes("devops") || goalLower.includes("cloud")) {
        addGap("Domain", "Cloud operations and deployment", "Medium", ["Build deployment and system design familiarity"]);
    } else {
        addGap("Domain", "Core software engineering", "Medium", ["Strengthen full-stack fundamentals and delivery"]);
    }

    if (Array.isArray(student?.skills) && student.skills.length < 4) {
        addGap("Profile", "Skill profile coverage", "Medium", ["Add more verified technical skills to your profile"]);
    }

    return gaps;
};

const getWeeklyMilestone = (index) => Math.ceil((index + 1) / 2);

const assignWeeklyMilestones = (items) =>
    items.map((item, index) => ({
        ...item,
        week: getWeeklyMilestone(index)
    }));

const buildWeeklyMilestones = (items) => {
    return items.reduce((weeks, item) => {
        const weekNumber = item.week || 1;
        const existing = weeks.find((group) => group.week === weekNumber);

        if (existing) {
            existing.items.push(item);
        } else {
            weeks.push({
                week: weekNumber,
                items: [item]
            });
        }

        return weeks;
    }, []);
};

const formatRoadmap = (roadmap) => {
    if (!roadmap) {
        return null;
    }

    const formatted = typeof roadmap.toObject === "function" ? roadmap.toObject() : { ...roadmap };
    formatted.weeklyMilestones = buildWeeklyMilestones(formatted.roadmapItems || []);
    return formatted;
};

const buildRoadmapItems = (skillGaps, goal) => {
    const items = [];
    const goalLower = goal.toLowerCase();

    skillGaps.forEach((gap) => {
        const basePriority = gap.priority === "High" ? "High" : gap.priority === "Medium" ? "Medium" : "Low";
        items.push({
            title: `${gap.title}`,
            description: `Focus on ${gap.domain.toLowerCase()} improvement with targeted practice and evidence-based revision.`,
            category: gap.domain,
            priority: basePriority,
            estimatedTime: basePriority === "High" ? "5-7 days" : basePriority === "Medium" ? "3-5 days" : "2-3 days",
            status: "Pending",
            source: "RuleEngine",
            relatedSkills: gap.evidence.slice(0, 3),
        });
    });

    if (goalLower.includes("data")) {
        items.push({
            title: "Strengthen SQL and analytics fundamentals",
            description: "Practice SQL joins, aggregations, and dashboard-style problem solving.",
            category: "Domain",
            priority: "High",
            estimatedTime: "4-6 days",
            status: "Pending",
            source: "RuleEngine",
            relatedSkills: ["SQL", "Analytics"],
        });
    } else if (goalLower.includes("devops") || goalLower.includes("cloud")) {
        items.push({
            title: "Practice deployment and infrastructure basics",
            description: "Learn deployment workflows, Linux basics, and containerization fundamentals.",
            category: "Domain",
            priority: "High",
            estimatedTime: "4-6 days",
            status: "Pending",
            source: "RuleEngine",
            relatedSkills: ["Deployment", "DevOps"],
        });
    } else {
        items.push({
            title: "Build a full-stack project",
            description: "Create a coherent project that demonstrates frontend, backend, and API integration skills.",
            category: "Project",
            priority: "Medium",
            estimatedTime: "1 week",
            status: "Pending",
            source: "RuleEngine",
            relatedSkills: ["Full Stack", "Projects"],
        });
    }

    return assignWeeklyMilestones(items).slice(0, 8);
};

const buildRecommendations = (skillGaps, goal, resumeAnalysis, codingProfile) => {
    const courses = [];
    const practiceTopics = [];
    const learningResources = [];
    const miniProjects = [];

    const addCourse = (title, description, priority, link = "") => {
        courses.push({ title, description, category: "Course", priority, estimatedTime: "3-5 days", status: "Pending", source: "RuleEngine", link });
    };

    const addPractice = (title, description, priority) => {
        practiceTopics.push({ title, description, category: "Practice", priority, estimatedTime: "2-3 days", status: "Pending", source: "RuleEngine" });
    };

    const addResource = (title, description, priority, link = "") => {
        learningResources.push({ title, description, category: "Resource", priority, estimatedTime: "1-2 days", status: "Pending", source: "RuleEngine", link });
    };

    const addProject = (title, description, priority) => {
        miniProjects.push({ title, description, category: "Project", priority, estimatedTime: "1 week", status: "Pending", source: "RuleEngine" });
    };

    if (goal.toLowerCase().includes("data")) {
        addCourse("SQL and Data Analytics Fundamentals", "Learn SQL joins, filtering, and analysis patterns.", "High", "https://www.w3schools.com/sql/");
        addPractice("Practice advanced SQL queries", "Work through joins, subqueries, and aggregations.", "High");
        addResource("Data Analytics Practice Workbook", "Use a workbook-style resource to strengthen analytical reasoning.", "Medium", "https://www.kaggle.com/");
        addProject("Build an analytics dashboard", "Create a dashboard using sample data and simple visualizations.", "Medium");
    } else if (goal.toLowerCase().includes("devops") || goal.toLowerCase().includes("cloud")) {
        addCourse("Cloud and DevOps Essentials", "Learn deployment, Linux basics, and CI/CD concepts.", "High", "https://learn.microsoft.com/azure/");
        addPractice("Practice deployment workflows", "Recreate a deployment pipeline using a sample app.", "High");
        addResource("Linux and Networking Cheat Sheets", "Use reference material to strengthen deployment fundamentals.", "Medium", "https://www.gnu.org/software/bash/");
        addProject("Deploy a sample application", "Containerize and deploy a small app to a basic platform.", "Medium");
    } else {
        addCourse("Full Stack Development Path", "Cover frontend, backend, and API integration fundamentals.", "High", "https://developer.mozilla.org/");
        addPractice("Practice debugging and API integration", "Improve error handling and connect frontend and backend flows.", "High");
        addResource("Project-based learning guide", "Use guided resources to build a complete application.", "Medium", "https://roadmap.sh/");
        addProject("Build a full-stack portfolio project", "Create a project that demonstrates your end-to-end skills.", "Medium");
    }

    if (Array.isArray(resumeAnalysis?.missingSkills) && resumeAnalysis.missingSkills.length > 0) {
        addCourse(`Bridge missing skills: ${resumeAnalysis.missingSkills[0]}`, "Use a focused course to close the first missing skill gap.", "Medium");
    }

    if (codingProfile?.score < 70) {
        addPractice("Practice coding problems by difficulty", "Work on easy and medium problems to improve consistency.", "High");
    }

    return { courses, practiceTopics, learningResources, miniProjects };
};

const buildProgress = (roadmapItems, recommendations) => {
    const allItems = [...roadmapItems, ...recommendations.courses, ...recommendations.practiceTopics, ...recommendations.learningResources, ...recommendations.miniProjects];
    const completedItems = allItems.filter((item) => item.status === "Completed").length;
    const inProgressItems = allItems.filter((item) => item.status === "In Progress").length;
    const pendingItems = allItems.filter((item) => item.status === "Pending").length;
    const completionPercentage = allItems.length === 0 ? 0 : Math.round((completedItems / allItems.length) * 100);

    return {
        completedItems,
        inProgressItems,
        pendingItems,
        completionPercentage,
    };
};

const generateRoadmap = async (studentId, careerGoal, overrideStatus = {}) => {
    const student = await Student.findById(studentId).select("name skills cgpa resume readinessProfile codingProfile");
    if (!student) {
        throw new Error("Student not found");
    }

    const goal = normalizeGoal(careerGoal);
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
    const codingProfile = student.codingProfile || {};
    const assessmentSignals = await getAssessmentSignals(studentId);
    const skillGaps = buildSkillGaps(student, resumeAnalysis, codingProfile, assessmentSignals, goal);
    const roadmapItems = buildRoadmapItems(skillGaps, goal);
    const recommendations = buildRecommendations(skillGaps, goal, resumeAnalysis, codingProfile);
    const progress = buildProgress(roadmapItems, recommendations);

    const roadmapPayload = {
        student: studentId,
        careerGoal: goal,
        summary: `Personalized roadmap for ${goal} built from assessment, resume, coding, and career-goal signals.`,
        skillGaps,
        roadmapItems: roadmapItems.map((item) => ({ ...item, status: normalizeStatus(overrideStatus[item.title] || item.status) })),
        recommendations: {
            courses: recommendations.courses.map((course) => ({ ...course, status: normalizeStatus(overrideStatus[course.title] || course.status) })),
            practiceTopics: recommendations.practiceTopics.map((topic) => ({ ...topic, status: normalizeStatus(overrideStatus[topic.title] || topic.status) })),
            learningResources: recommendations.learningResources.map((resource) => ({ ...resource, status: normalizeStatus(overrideStatus[resource.title] || resource.status) })),
            miniProjects: recommendations.miniProjects.map((project) => ({ ...project, status: normalizeStatus(overrideStatus[project.title] || project.status) })),
        },
        progress,
    };

    const existingRoadmap = await Roadmap.findOne({ student: studentId });
    if (existingRoadmap) {
        Object.assign(existingRoadmap, roadmapPayload);
        existingRoadmap.updatedAt = new Date();
        await existingRoadmap.save();
        return existingRoadmap;
    }

    const createdRoadmap = await Roadmap.create(roadmapPayload);
    return createdRoadmap;
};

const getRoadmapByStudent = async (studentId) => {
    const roadmap = await Roadmap.findOne({ student: studentId }).lean();
    return formatRoadmap(roadmap);
};

const getRoadmapProgress = async (studentId) => {
    const roadmap = await getRoadmapByStudent(studentId);
    if (!roadmap) {
        throw new Error("Roadmap not found");
    }
    return roadmap.progress;
};

const updateRoadmapMilestoneStatus = async (studentId, milestoneId, status) => {
    const roadmap = await Roadmap.findOne({ student: studentId });
    if (!roadmap) {
        throw new Error("Roadmap not found");
    }

    const allowedStatuses = ["Pending", "In Progress", "Completed"];
    if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid status value");
    }

    const updateItem = (items) => {
        if (!Array.isArray(items)) {
            return null;
        }
        return items.find((item) => item._id?.toString() === milestoneId);
    };

    const target =
        updateItem(roadmap.roadmapItems) ||
        updateItem(roadmap.recommendations.courses) ||
        updateItem(roadmap.recommendations.practiceTopics) ||
        updateItem(roadmap.recommendations.learningResources) ||
        updateItem(roadmap.recommendations.miniProjects);

    if (!target) {
        throw new Error("Milestone not found");
    }

    target.status = status;
    roadmap.progress = buildProgress(roadmap.roadmapItems, roadmap.recommendations);
    roadmap.updatedAt = new Date();

    await roadmap.save();
    return formatRoadmap(roadmap);
};

const updateRoadmapProgress = async (studentId, updates) => {
    const roadmap = await Roadmap.findOne({ student: studentId });
    if (!roadmap) {
        throw new Error("Roadmap not found");
    }

    const allowedStatuses = ["Pending", "In Progress", "Completed"];
    if (Array.isArray(updates)) {
        updates.forEach((entry) => {
            if (!entry || typeof entry !== "object") {
                throw new Error("Invalid update payload");
            }
            if (typeof entry.title !== "string" || !entry.title.trim()) {
                throw new Error("Invalid update title");
            }
            if (!allowedStatuses.includes(entry.status)) {
                throw new Error("Invalid status value");
            }
        });

        updates.forEach((entry) => {
            const applyTo = (items) => {
                const target = items.find((item) => item.title === entry.title);
                if (target) {
                    target.status = entry.status;
                }
            };

            applyTo(roadmap.roadmapItems);
            applyTo(roadmap.recommendations.courses);
            applyTo(roadmap.recommendations.practiceTopics);
            applyTo(roadmap.recommendations.learningResources);
            applyTo(roadmap.recommendations.miniProjects);
        });
    }

    const progress = buildProgress(roadmap.roadmapItems, roadmap.recommendations);
    roadmap.progress = progress;
    roadmap.updatedAt = new Date();
    await roadmap.save();
    return roadmap;
};

module.exports = {
    generateRoadmap,
    getRoadmapByStudent,
    getRoadmapProgress,
    updateRoadmapMilestoneStatus,
    updateRoadmapProgress,
};
