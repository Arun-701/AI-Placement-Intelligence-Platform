const router = require("express").Router();
const verifyToken = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const controller = require("../controllers/adminAssessmentController");

const adminOnly = [verifyToken, authorizeRoles("admin")];
router.get("/departments", adminOnly, controller.getDepartments);
router.get("/", adminOnly, controller.getAssessments);
router.post("/", adminOnly, controller.createAssessment);
router.post("/:id/assign", adminOnly, controller.assignAssessment);
router.post("/assign/:id", adminOnly, controller.assignAssessment);
router.patch("/:id/deadline", adminOnly, controller.updateDeadline);
router.post("/:id/enable", adminOnly, controller.enableAssessment);
router.get("/:id/details", adminOnly, controller.getAssessmentDetails);
router.put("/edit/:id", adminOnly, controller.updateTitle);
router.delete("/:id", adminOnly, controller.deleteAssessment);
module.exports = router;
