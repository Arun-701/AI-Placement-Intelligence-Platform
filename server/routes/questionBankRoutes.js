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
router.get("/", verifyToken, authorizeRoles("faculty"), getQuestions);
router.get("/:id", verifyToken, authorizeRoles("faculty"), getQuestionById);
router.put("/:id", verifyToken, authorizeRoles("faculty"), updateQuestion);
router.delete("/:id", verifyToken, authorizeRoles("faculty"), deleteQuestion);

module.exports = router;
