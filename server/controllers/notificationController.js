const {
  createNotification,
  getUserNotifications,
  getAllNotifications,
  markAsRead,
  markAllRead,
  deleteNotification,
  broadcastNotification
} = require("../services/notificationService");
const {
  validateNotificationPayload,
  validateNotificationId
} = require("../validators/notificationValidator");
const { successResponse, errorResponse } = require("../utils/response");

const getNotifications = async (req, res) => {
  try {
    const notifications = await getUserNotifications(req.user.role, req.user.id);
    return successResponse(res, { message: "Notifications fetched successfully", data: notifications });
  } catch (error) {
    return errorResponse(res, { message: error.message || "Unable to fetch notifications", status: 500 });
  }
};

const getUnreadNotifications = async (req, res) => {
  try {
    const notifications = await getUserNotifications(req.user.role, req.user.id, true);
    return successResponse(res, { message: "Unread notifications fetched successfully", data: notifications });
  } catch (error) {
    return errorResponse(res, { message: error.message || "Unable to fetch unread notifications", status: 500 });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const validationError = validateNotificationId(req.params.id);
    if (validationError) {
      return errorResponse(res, { message: validationError, status: 400 });
    }

    const notification = await markAsRead({
      notificationId: req.params.id,
      recipientType: req.user.role,
      recipientId: req.user.id,
      allowAny: req.user.role === "admin"
    });

    return successResponse(res, { message: "Notification marked as read", data: notification });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: error.message.includes("not found") ? 404 : 403 });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    await markAllRead({ recipientType: req.user.role, recipientId: req.user.id });
    return successResponse(res, { message: "All notifications marked as read" });
  } catch (error) {
    return errorResponse(res, { message: error.message || "Unable to mark notifications as read", status: 500 });
  }
};

const removeNotification = async (req, res) => {
  try {
    const validationError = validateNotificationId(req.params.id);
    if (validationError) {
      return errorResponse(res, { message: validationError, status: 400 });
    }

    const notification = await deleteNotification({
      notificationId: req.params.id,
      recipientType: req.user.role,
      recipientId: req.user.id,
      allowAny: req.user.role === "admin"
    });

    return successResponse(res, { message: "Notification deleted successfully", data: notification });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: error.message.includes("not found") ? 404 : 403 });
  }
};

const getAll = async (req, res) => {
  try {
    const notifications = await getAllNotifications();
    return successResponse(res, { message: "All notifications fetched successfully", data: notifications });
  } catch (error) {
    return errorResponse(res, { message: error.message || "Unable to fetch notifications", status: 500 });
  }
};

const broadcast = async (req, res) => {
  try {
    const { errors, data } = validateNotificationPayload(req.body, true);
    if (errors.length > 0) {
      return errorResponse(res, { message: errors.join(", "), status: 400 });
    }

    const notifications = await broadcastNotification(data);
    return successResponse(res, { message: "Broadcast sent successfully", data: notifications });
  } catch (error) {
    return errorResponse(res, { message: error.message || "Unable to broadcast notifications", status: 500 });
  }
};

module.exports = {
  getNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  removeNotification,
  getAll,
  broadcast
};
