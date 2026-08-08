const mongoose = require("mongoose");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const Admin = require("../models/Admin");
const Notification = require("../models/Notification");

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

  const recipients = await Model.find({ isActive: true }).select("_id").lean();
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

const getUserNotifications = async (recipientType, recipientId, unreadOnly = false) => {
  if (!validateRecipientType(recipientType)) {
    throw new Error("Invalid recipient type");
  }

  if (!mongoose.isValidObjectId(recipientId)) {
    throw new Error("Invalid recipient ID");
  }

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
  getUserNotifications,
  getAllNotifications,
  markAsRead,
  markAllRead,
  deleteNotification,
  broadcastNotification
};
