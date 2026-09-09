const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const controller = require("../controllers/announcementController");

router.get("/", verifyToken, authorizeRoles("student", "faculty"), controller.listVisibleAnnouncements);
module.exports = router;
