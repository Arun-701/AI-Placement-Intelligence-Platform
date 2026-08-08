const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const {
  getNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  removeNotification,
  getAll,
  broadcast
} = require("../controllers/notificationController");

router.get("/", verifyToken, authorizeRoles("student", "faculty", "admin"), getNotifications);
router.get("/unread", verifyToken, authorizeRoles("student", "faculty", "admin"), getUnreadNotifications);
router.patch("/:id/read", verifyToken, authorizeRoles("student", "faculty", "admin"), markNotificationAsRead);
router.patch("/read-all", verifyToken, authorizeRoles("student", "faculty", "admin"), markAllNotificationsAsRead);
router.delete("/:id", verifyToken, authorizeRoles("student", "faculty", "admin"), removeNotification);

router.get("/all", verifyToken, authorizeRoles("admin"), getAll);
router.post("/broadcast", verifyToken, authorizeRoles("admin"), broadcast);

module.exports = router;
