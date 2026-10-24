const { successResponse, errorResponse } = require("../utils/response");
const { validateProfileInput } = require("../validators/studentProfileValidator");
const {
  getStudentProfile,
  updateStudentProfile,
  getProfileCompletionStatus,
  getStudentDashboard
} = require("../services/studentProfileService");
const { createNotification } = require("../services/notificationService");

const getProfile = async (req, res) => {
  try {
    const profile = await getStudentProfile(req.user.id);
    return successResponse(res, { message: "Student profile fetched successfully", data: profile });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { errors, data } = validateProfileInput(req.body);
    if (errors.length > 0) {
      return errorResponse(res, { message: errors.join(", "), status: 400 });
    }

    const result = await updateStudentProfile(req.user.id, data);

    try {
      await createNotification({
        recipient: req.user.id,
        recipientType: "student",
        title: "Profile Updated Successfully",
        message: "Your student profile has been updated successfully.",
        type: "Profile Updated",
        priority: "Low",
        referenceId: req.user.id,
        referenceModel: "Student"
      });
    } catch (notificationError) {
      console.error("Notification creation failed:", notificationError.message);
    }

    return successResponse(res, {
      message: "Student profile updated successfully",
      data: {
        student: result.student,
        profileCompletion: result.profileCompletion,
        missingFields: result.missingFields
      }
    });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const getProfileCompletion = async (req, res) => {
  try {
    const completion = await getProfileCompletionStatus(req.user.id);
    return successResponse(res, {
      message: "Profile completion status fetched successfully",
      data: completion
    });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const getDashboard = async (req, res) => {
  try {
    const dashboard = await getStudentDashboard(req.user.id);

    return successResponse(res, {
      message: "Student dashboard fetched successfully",
      data: dashboard
    });
  } catch (error) {
    console.error("Dashboard Error:", error);

    return errorResponse(res, {
      message: error.message,
      status: 500
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getProfileCompletion,
  getDashboard
};
