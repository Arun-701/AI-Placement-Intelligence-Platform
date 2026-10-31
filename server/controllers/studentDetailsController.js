const { successResponse, errorResponse } = require("../utils/response");
const { getStudentDetails } = require("../services/studentDetailsService");

const getAdminStudentDetails = async (req, res) => {
  try {
    const data = await getStudentDetails(req.params.id, {
      role: "admin",
      userId: req.user.id
    });
    return successResponse(res, { message: "Student details fetched successfully", data });
  } catch (error) {
    return errorResponse(res, {
      message: error.message || "Failed to fetch student details.",
      status: error.status || 500
    });
  }
};

const getFacultyStudentDetails = async (req, res) => {
  try {
    const data = await getStudentDetails(req.params.id, {
      role: "faculty",
      userId: req.user.id
    });
    return successResponse(res, { message: "Student details fetched successfully", data });
  } catch (error) {
    return errorResponse(res, {
      message: error.message || "Failed to fetch student details.",
      status: error.status || 500
    });
  }
};

module.exports = { getAdminStudentDetails, getFacultyStudentDetails };
