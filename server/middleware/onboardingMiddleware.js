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
    console.log("[OnboardingMiddleware] requireAssignmentComplete - path:", req.path, "method:", req.method);
    const student = await Student.findById(req.user.id).select('profileCompleted initialAssessmentCompleted');
    console.log("[OnboardingMiddleware] Student found:", student ? "yes" : "no");
    
    if (!student) {
      console.log("[OnboardingMiddleware] Student not found, returning 404");
      return errorResponse(res, { message: 'Student not found', status: 404 });
    }
    if (!student.profileCompleted) {
      console.log("[OnboardingMiddleware] Profile not complete, returning 403");
      return errorResponse(res, { message: 'Profile incomplete', status: 403 });
    }
    if (!student.initialAssessmentCompleted) {
      console.log("[OnboardingMiddleware] Assessment not complete, returning 403");
      return errorResponse(res, { message: 'Assignment incomplete', status: 403 });
    }
    console.log("[OnboardingMiddleware] All checks passed, calling next()");
    return next();
  } catch (error) {
    console.error("[OnboardingMiddleware] Error:", error.message);
    console.error("[OnboardingMiddleware] Stack:", error.stack);
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

module.exports = {
  requireProfileComplete,
  requireAssignmentComplete
};
