const {
    buildDashboardPayload,
    buildStudentAnalytics,
    buildStudentReport,
    buildFacultyDashboard,
    buildFacultyAnalytics,
    buildFacultyReport,
    buildAssessmentReport,
    buildPlacementAnalytics
} = require("../services/dashboardService");
const { successResponse, errorResponse } = require("../utils/response");

const getDashboard = async (req, res) => {
    try {
        const dashboard = await buildDashboardPayload(req.user.id);
        return successResponse(res, { message: "Dashboard fetched successfully", data: dashboard });
    } catch (error) {
        return errorResponse(res, { message: error.message || "Unable to fetch dashboard", status: 500 });
    }
};

const getStudentDashboard = async (req, res) => {
    try {
        const dashboard = await buildDashboardPayload(req.user.id);
        return successResponse(res, { message: "Student dashboard fetched successfully", data: dashboard });
    } catch (error) {
        return errorResponse(res, { message: error.message || "Unable to fetch student dashboard", status: 500 });
    }
};

const getFacultyDashboard = async (req, res) => {
    try {
        const dashboard = await buildFacultyDashboard(req.user.id);
        return successResponse(res, { message: "Faculty dashboard fetched successfully", data: dashboard });
    } catch (error) {
        return errorResponse(res, { message: error.message || "Unable to fetch faculty dashboard", status: 500 });
    }
};

const getStudentAnalytics = async (req, res) => {
    try {
        const analytics = await buildStudentAnalytics(req.user.id);
        return successResponse(res, { message: "Student analytics fetched successfully", data: analytics });
    } catch (error) {
        return errorResponse(res, { message: error.message || "Unable to fetch student analytics", status: 500 });
    }
};

const getFacultyAnalytics = async (req, res) => {
    try {
        const analytics = await buildFacultyAnalytics(req.user.id);
        return successResponse(res, { message: "Faculty analytics fetched successfully", data: analytics });
    } catch (error) {
        return errorResponse(res, { message: error.message || "Unable to fetch faculty analytics", status: 500 });
    }
};

const getPlacementAnalytics = async (req, res) => {
    try {
        const analytics = await buildPlacementAnalytics();
        return successResponse(res, { message: "Placement analytics fetched successfully", data: analytics });
    } catch (error) {
        return errorResponse(res, { message: error.message || "Unable to fetch placement analytics", status: 500 });
    }
};

const getStudentReport = async (req, res) => {
    try {
        const report = await buildStudentReport(req.user.id);
        return successResponse(res, { message: "Student performance report fetched successfully", data: report });
    } catch (error) {
        return errorResponse(res, { message: error.message || "Unable to fetch student report", status: 500 });
    }
};

const getFacultyReport = async (req, res) => {
    try {
        const report = await buildFacultyReport(req.user.id);
        return successResponse(res, { message: "Faculty performance report fetched successfully", data: report });
    } catch (error) {
        return errorResponse(res, { message: error.message || "Unable to fetch faculty report", status: 500 });
    }
};

const getAssessmentReport = async (req, res) => {
    try {
        const report = await buildAssessmentReport(req.user.id);
        return successResponse(res, { message: "Assessment report fetched successfully", data: report });
    } catch (error) {
        return errorResponse(res, { message: error.message || "Unable to fetch assessment report", status: 500 });
    }
};

module.exports = {
    getDashboard,
    getStudentDashboard,
    getFacultyDashboard,
    getStudentAnalytics,
    getFacultyAnalytics,
    getPlacementAnalytics,
    getStudentReport,
    getFacultyReport,
    getAssessmentReport
};
