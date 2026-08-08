const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { chatWithAI } = require("../controllers/aiController");

router.post(
    "/chat",
    verifyToken,
    authorizeRoles("student", "faculty"),
    chatWithAI
);

module.exports = router;
