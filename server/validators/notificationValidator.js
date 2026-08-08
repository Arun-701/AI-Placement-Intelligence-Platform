const mongoose = require("mongoose");

const VALID_RECIPIENT_TYPES = ["student", "faculty", "admin"];
const VALID_NOTIFICATION_TYPES = [
  "Assessment Assigned",
  "Assessment Published",
  "Assessment Reminder",
  "Assessment Submitted",
  "Assessment Result",
  "Resume Analysis Complete",
  "Career Recommendation Ready",
  "Roadmap Generated",
  "Profile Updated",
  "System Notification",
  "Admin Notification"
];
const VALID_PRIORITIES = ["Low", "Medium", "High"];

const isValidObjectId = (value) => {
  return typeof value === "string" && mongoose.isValidObjectId(value);
};

const validateNotificationPayload = (payload, isBroadcast = false) => {
  const errors = [];
  const data = {};

  if (!payload || typeof payload !== "object") {
    errors.push("Payload must be an object");
    return { errors, data };
  }

  if (!payload.title || typeof payload.title !== "string" || payload.title.trim().length === 0) {
    errors.push("Title is required");
  } else {
    data.title = payload.title.trim();
  }

  if (!payload.message || typeof payload.message !== "string" || payload.message.trim().length === 0) {
    errors.push("Message is required");
  } else {
    data.message = payload.message.trim();
  }

  if (!payload.type || typeof payload.type !== "string" || !VALID_NOTIFICATION_TYPES.includes(payload.type)) {
    errors.push(`Type must be one of: ${VALID_NOTIFICATION_TYPES.join(", ")}`);
  } else {
    data.type = payload.type;
  }

  if (!payload.priority || typeof payload.priority !== "string" || !VALID_PRIORITIES.includes(payload.priority)) {
    errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(", ")}`);
  } else {
    data.priority = payload.priority;
  }

  if (!payload.recipientType || typeof payload.recipientType !== "string" || !VALID_RECIPIENT_TYPES.includes(payload.recipientType)) {
    errors.push(`recipientType must be one of: ${VALID_RECIPIENT_TYPES.join(", ")}`);
  } else {
    data.recipientType = payload.recipientType;
  }

  if (!isBroadcast) {
    if (!payload.recipient || !isValidObjectId(payload.recipient)) {
      errors.push("Valid recipient ID is required");
    } else {
      data.recipient = payload.recipient;
    }
  }

  if (payload.referenceId !== undefined && payload.referenceId !== null && payload.referenceId !== "") {
    if (!isValidObjectId(payload.referenceId)) {
      errors.push("referenceId must be a valid ObjectId");
    } else {
      data.referenceId = payload.referenceId;
    }
  }

  if (payload.referenceModel !== undefined) {
    if (payload.referenceModel !== null && typeof payload.referenceModel !== "string") {
      errors.push("referenceModel must be a string");
    } else {
      data.referenceModel = payload.referenceModel ? payload.referenceModel.trim() : "";
    }
  }

  if (isBroadcast) {
    if (payload.recipientIds !== undefined) {
      if (!Array.isArray(payload.recipientIds) || payload.recipientIds.length === 0) {
        errors.push("recipientIds must be a non-empty array of IDs");
      } else {
        const invalidIds = payload.recipientIds.filter((id) => !isValidObjectId(id));
        if (invalidIds.length > 0) {
          errors.push("recipientIds must contain valid ObjectIds only");
        } else {
          data.recipientIds = [...new Set(payload.recipientIds)];
        }
      }
    }
  }

  return { errors, data };
};

const validateNotificationId = (notificationId) => {
  if (!isValidObjectId(notificationId)) {
    return "Invalid notification ID";
  }
  return null;
};

module.exports = {
  VALID_RECIPIENT_TYPES,
  VALID_NOTIFICATION_TYPES,
  VALID_PRIORITIES,
  validateNotificationPayload,
  validateNotificationId,
  isValidObjectId
};
