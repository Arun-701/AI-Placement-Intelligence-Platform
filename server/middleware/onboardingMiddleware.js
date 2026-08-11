const Student = require("../models/Student");
const { errorResponse } = require("../utils/response");

const requireProfileComplete = async (req, res, next) => {
  try {
    const student = await Student.findById(req.user.id).select('profileCompleted');
    if (!student) return errorResponse(res, { message: 'Student not found', status: 404 });
    if (!student.profileCompleted) return errorResponse(res, { message: 'Profile incomplete', status: 403 });
    return next();
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const requireAssignmentComplete = async (req, res, next) => {
  try {
    const student = await Student.findById(req.user.id).select('profileCompleted initialAssessmentCompleted');
    if (!student) return errorResponse(res, { message: 'Student not found', status: 404 });
    if (!student.profileCompleted) return errorResponse(res, { message: 'Profile incomplete', status: 403 });
    if (!student.initialAssessmentCompleted) return errorResponse(res, { message: 'Assignment incomplete', status: 403 });
    return next();
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

module.exports = {
  requireProfileComplete,
  requireAssignmentComplete
};
