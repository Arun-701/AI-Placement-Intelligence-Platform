const {
    generateRoadmap: generateRoadmapService,
    getRoadmapByStudent,
    updateRoadmapProgress,
    updateRoadmapMilestoneStatus,
    getRoadmapProgress: getRoadmapProgressService
} = require("../services/roadmapService");
const { createNotification } = require("../services/notificationService");
const { successResponse, errorResponse } = require("../utils/response");

const getRoadmap = async (req, res) => {
    try {
        const roadmap = await getRoadmapByStudent(req.user.id);
        if (!roadmap) {
            return errorResponse(res, { message: "Roadmap not found", status: 404 });
        }

        return successResponse(res, { message: "Roadmap fetched successfully", data: roadmap });
    } catch (error) {
        return errorResponse(res, { message: error.message || "Unable to fetch roadmap", status: 500 });
    }
};

const generateRoadmap = async (req, res) => {
    try {
        const targetRole = typeof req.body.targetRole === "string" && req.body.targetRole.trim()
            ? req.body.targetRole.trim()
            : typeof req.body.careerGoal === "string"
                ? req.body.careerGoal.trim()
                : "";

        const roadmap = await generateRoadmapService(req.user.id, targetRole, {});

        try {
            await createNotification({
                recipient: req.user.id,
                recipientType: "student",
                title: "Roadmap Generated",
                message: "A personalized roadmap has been generated for you. Review your next steps.",
                type: "Roadmap Generated",
                priority: "Medium",
                referenceId: roadmap._id,
                referenceModel: "Roadmap"
            });
        } catch (notificationError) {
            console.error("Notification creation failed:", notificationError.message);
        }

        return successResponse(res, { message: "Roadmap generated successfully", data: roadmap });
    } catch (error) {
        return errorResponse(res, { message: error.message || "Unable to generate roadmap", status: 500 });
    }
};

const updateProgress = async (req, res) => {
    try {
        if (!Array.isArray(req.body)) {
            return errorResponse(res, { message: "Request body must be an array of progress updates", status: 400 });
        }

        const hasValidEntries = req.body.every((entry) =>
            entry &&
            typeof entry === "object" &&
            typeof entry.title === "string" &&
            entry.title.trim() &&
            ["Pending", "In Progress", "Completed"].includes(entry.status)
        );

        if (!hasValidEntries) {
            return errorResponse(res, { message: "Each progress update must include a non-empty title and a valid status", status: 400 });
        }

        const roadmap = await updateRoadmapProgress(req.user.id, req.body);
        return successResponse(res, { message: "Roadmap progress updated successfully", data: roadmap });
    } catch (error) {
        return errorResponse(res, { message: error.message || "Unable to update roadmap progress", status: 400 });
    }
};

const getMyRoadmap = getRoadmap;

const updateRoadmapMilestone = async (req, res) => {
    try {
        const milestoneId = typeof req.params.id === "string" ? req.params.id.trim() : "";
        const status = typeof req.body.status === "string" ? req.body.status.trim() : "";
        const allowedStatuses = ["Pending", "In Progress", "Completed"];

        if (!milestoneId) {
            return errorResponse(res, { message: "Milestone ID is required", status: 400 });
        }

        if (!allowedStatuses.includes(status)) {
            return errorResponse(res, { message: "Status must be one of Pending, In Progress, or Completed", status: 400 });
        }

        const roadmap = await updateRoadmapMilestoneStatus(req.user.id, milestoneId, status);
        return successResponse(res, { message: "Milestone updated successfully", data: roadmap });
    } catch (error) {
        return errorResponse(res, { message: error.message || "Unable to update milestone", status: 400 });
    }
};

const getRoadmapProgress = async (req, res) => {
    try {
        const progress = await getRoadmapProgressService(req.user.id);
        return successResponse(res, { message: "Roadmap progress fetched successfully", data: progress });
    } catch (error) {
        return errorResponse(res, { message: error.message || "Unable to fetch roadmap progress", status: 404 });
    }
};

module.exports = {
    getRoadmap,
    getMyRoadmap,
    generateRoadmap,
    updateRoadmapMilestone,
    getRoadmapProgress,
    updateProgress,
};
