const express = require("express");
const router = express.Router();

const {
    createQuestion,
    getQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion
} = require("../controllers/questionBankController");

const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.post("/", verifyToken, authorizeRoles("faculty"), createQuestion);
router.get("/", verifyToken, authorizeRoles("faculty", "admin"), getQuestions);
router.get("/:id", verifyToken, authorizeRoles("faculty", "admin"), getQuestionById);
router.put("/:id", verifyToken, authorizeRoles("faculty", "admin"), updateQuestion);
router.delete("/:id", verifyToken, authorizeRoles("faculty", "admin"), deleteQuestion);

module.exports = router;
