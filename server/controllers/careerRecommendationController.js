const { generateCareerRecommendation } = require("../services/careerRecommendationService");
const { createNotification } = require("../services/notificationService");
const { successResponse, errorResponse } = require("../utils/response");

const getCareerRecommendation = async (req, res) => {
    try {
        const recommendation = await generateCareerRecommendation(req.user.id);

        try {
            await createNotification({
                recipient: req.user.id,
                recipientType: "student",
                title: "Career Recommendation Ready",
                message: "Your career recommendation is ready. Check your dashboard for the new guidance.",
                type: "Career Recommendation Ready",
                priority: "Medium",
                referenceId: req.user.id,
                referenceModel: "Student"
            });
        } catch (notificationError) {
            console.error("Notification creation failed:", notificationError.message);
        }

        return successResponse(res, { message: "Career recommendation generated successfully", data: recommendation });
    } catch (error) {
        if (error.message === "Resume not found") {
            return errorResponse(res, { message: "Resume not found", status: 404 });
        }

        return errorResponse(res, { message: "Unable to generate career recommendation", status: 500 });
    }
};

module.exports = {
    getCareerRecommendation
};
