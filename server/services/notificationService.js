const mongoose = require("mongoose");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const Admin = require("../models/Admin");
const Notification = require("../models/Notification");
const AssessmentAttendanceRequest = require("../models/AssessmentAttendanceRequest");

const VALID_RECIPIENT_TYPES = ["student", "faculty", "admin"];

const recipientModels = {
  student: Student,
  faculty: Faculty,
  admin: Admin
};

const validateRecipientType = (recipientType) => VALID_RECIPIENT_TYPES.includes(recipientType);

const ensureRecipientExists = async (recipientType, recipientId) => {
  if (!validateRecipientType(recipientType)) {
    throw new Error("Invalid recipient type");
  }

  if (!mongoose.isValidObjectId(recipientId)) {
    throw new Error("Invalid recipient ID");
  }

  const Model = recipientModels[recipientType];
  if (!Model) {
    throw new Error("Unknown recipient type");
  }

  const recipient = await Model.findById(recipientId).select("_id isActive").lean();
  if (!recipient) {
    throw new Error(`${recipientType.charAt(0).toUpperCase() + recipientType.slice(1)} not found`);
  }

  return recipient;
};

const buildNotificationDocument = ({ recipient, recipientType, title, message, type, priority, referenceId, referenceModel }) => ({
  recipient,
  recipientType,
  title,
  message,
  type,
  priority,
  referenceId: referenceId || null,
  referenceModel: referenceModel || "",
  isRead: false,
  readAt: null
});

const getActiveRecipients = async (recipientType) => {
  const Model = recipientModels[recipientType];
  if (!Model) {
    throw new Error("Invalid recipient type for broadcast");
  }

  const recipients = await Model.find({ isActive: { $ne: false } }).select("_id").lean();
  return recipients.map((recipient) => recipient._id.toString());
};

const createNotification = async ({ recipient, recipientType, title, message, type, priority, referenceId, referenceModel }) => {
  await ensureRecipientExists(recipientType, recipient);

  const notification = buildNotificationDocument({
    recipient,
    recipientType,
    title,
    message,
    type,
    priority,
    referenceId,
    referenceModel
  });

  return Notification.create(notification);
};

const createBulkNotification = async ({ recipientType, recipientIds, title, message, type, priority, referenceId, referenceModel }) => {
  if (!validateRecipientType(recipientType)) {
    throw new Error("Invalid recipient type");
  }

  const recipients = Array.isArray(recipientIds) && recipientIds.length > 0
    ? [...new Set(recipientIds.filter((id) => mongoose.isValidObjectId(id)))]
    : await getActiveRecipients(recipientType);

  if (recipients.length === 0) {
    throw new Error("No valid recipients found for bulk notification");
  }

  const documents = recipients.map((recipient) => buildNotificationDocument({
    recipient,
    recipientType,
    title,
    message,
    type,
    priority,
    referenceId,
    referenceModel
  }));

  return Notification.insertMany(documents);
};

const createAdminStudentRequestNotifications = async ({ request, assessment, student }) => {
  const admins = await getActiveRecipients("admin");
  if (!admins.length) throw new Error("No active Admin accounts are available for student request notifications");

  const requestId = request._id.toString();
  const notification = buildNotificationDocument({
    recipient: null,
    recipientType: "admin",
    title: "Retest Request",
    message: `${student.name} has requested a retest for ${assessment.title}. Admin action is required.`,
    type: "Student Request",
    priority: "Medium",
    referenceId: assessment._id,
    referenceModel: "Assessment",
  });
  notification.context = {
    requestId,
    studentId: student._id.toString(),
    setIndex: Number(request.setIndex) || 0,
  };

  const created = [];
  for (const recipient of admins) {
    try {
      const result = await Notification.findOneAndUpdate(
        { recipient, type: "Student Request", "context.requestId": requestId },
        { $setOnInsert: { ...notification, recipient } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      created.push(result);
    } catch (error) {
      if (error.code !== 11000) throw error;
      const existing = await Notification.findOne({
        recipient,
        type: "Student Request",
        "context.requestId": requestId,
      });
      if (!existing) throw error;
      created.push(existing);
    }
  }

  return created;
};

const markAdminStudentRequestNotificationsHandled = async (requestIds) => {
  const normalizedIds = [...new Set((requestIds || []).map(String))];
  if (!normalizedIds.length) return { modifiedCount: 0 };

  return Notification.updateMany(
    {
      recipientType: "admin",
      type: "Student Request",
      "context.requestId": { $in: normalizedIds },
      isRead: false,
    },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

const ensurePendingStudentRequestNotifications = async () => {
  const pendingRequests = await AssessmentAttendanceRequest.find({
    active: { $ne: false },
    status: "Requested",
  })
    .populate("assessment", "title")
    .populate("student", "name")
    .lean();

  for (const request of pendingRequests) {
    if (!request.assessment || !request.student) {
      throw new Error(`Cannot create notification for pending request ${request._id}: assessment or student is missing`);
    }
    await createAdminStudentRequestNotifications({
      request,
      assessment: request.assessment,
      student: request.student,
    });
  }
};

const getUserNotifications = async (recipientType, recipientId, unreadOnly = false) => {
  if (!validateRecipientType(recipientType)) {
    throw new Error("Invalid recipient type");
  }

  if (!mongoose.isValidObjectId(recipientId)) {
    throw new Error("Invalid recipient ID");
  }

  if (recipientType === "admin") await ensurePendingStudentRequestNotifications();

  const query = {
    recipient: recipientId,
    recipientType
  };

  if (unreadOnly) {
    query.isRead = false;
  }

  return Notification.find(query).sort({ createdAt: -1 }).lean();
};

const getAllNotifications = async () => {
  return Notification.find().sort({ createdAt: -1 }).lean();
};

const markAsRead = async ({ notificationId, recipientType, recipientId, allowAny = false }) => {
  if (!mongoose.isValidObjectId(notificationId)) {
    throw new Error("Invalid notification ID");
  }

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new Error("Notification not found");
  }

  if (!allowAny) {
    if (notification.recipientType !== recipientType || notification.recipient.toString() !== recipientId.toString()) {
      throw new Error("You do not have permission to update this notification");
    }
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return notification;
};

const markAllRead = async ({ recipientType, recipientId }) => {
  if (!validateRecipientType(recipientType)) {
    throw new Error("Invalid recipient type");
  }

  if (!mongoose.isValidObjectId(recipientId)) {
    throw new Error("Invalid recipient ID");
  }

  const result = await Notification.updateMany(
    { recipientType, recipient: recipientId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return result;
};

const deleteNotification = async ({ notificationId, recipientType, recipientId, allowAny = false }) => {
  if (!mongoose.isValidObjectId(notificationId)) {
    throw new Error("Invalid notification ID");
  }

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new Error("Notification not found");
  }

  if (!allowAny) {
    if (notification.recipientType !== recipientType || notification.recipient.toString() !== recipientId.toString()) {
      throw new Error("You do not have permission to delete this notification");
    }
  }

  await notification.deleteOne();
  return notification;
};

const broadcastNotification = async ({ recipientType, recipientIds, title, message, type, priority, referenceId, referenceModel }) => {
  return createBulkNotification({ recipientType, recipientIds, title, message, type, priority, referenceId, referenceModel });
};

module.exports = {
  createNotification,
  createBulkNotification,
  createAdminStudentRequestNotifications,
  markAdminStudentRequestNotificationsHandled,
  ensurePendingStudentRequestNotifications,
  getUserNotifications,
  getAllNotifications,
  markAsRead,
  markAllRead,
  deleteNotification,
  broadcastNotification
};
