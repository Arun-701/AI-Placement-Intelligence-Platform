const Announcement = require("../models/Announcement");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const { successResponse, errorResponse } = require("../utils/response");

const getDepartments = async (req, res) => {
  try {
    const [studentDepartments, facultyDepartments] = await Promise.all([
      Student.distinct("department", { department: { $nin: [null, ""] } }),
      Faculty.distinct("department", { department: { $nin: [null, ""] } }),
    ]);
    return successResponse(res, { data: [...new Set([...studentDepartments, ...facultyDepartments])].sort() });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const message = String(req.body?.message || "").trim();
    const targetType = String(req.body?.targetType || "");
    const departments = Array.isArray(req.body?.departments) ? [...new Set(req.body.departments.map((department) => String(department).trim()).filter(Boolean))] : [];
    if (!title || !message) return errorResponse(res, { message: "Title and message are required", status: 400 });
    if (!["ALL_STUDENTS", "ALL_FACULTY", "ALL_USERS", "DEPARTMENT"].includes(targetType)) return errorResponse(res, { message: "A valid announcement target is required", status: 400 });
    if (targetType === "DEPARTMENT" && !departments.length) return errorResponse(res, { message: "Please select at least one department.", status: 400 });
    const announcement = await Announcement.create({ title, message, targetType, departments: targetType === "DEPARTMENT" ? departments : [], createdBy: req.user.id });
    return successResponse(res, { status: 201, message: "Announcement sent successfully", data: announcement });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const listAdminAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ createdBy: req.user.id }).populate("createdBy", "name email").sort({ createdAt: -1 }).lean();
    return successResponse(res, { data: announcements });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

const listVisibleAnnouncements = async (req, res) => {
  try {
    const audience = req.user.role === "student" ? "ALL_STUDENTS" : "ALL_FACULTY";
    const Model = req.user.role === "student" ? Student : Faculty;
    const user = await Model.findById(req.user.id).select("department").lean();
    if (!user) return errorResponse(res, { message: "User not found", status: 404 });
    const announcements = await Announcement.find({
      $or: [
        { targetType: "ALL_USERS" },
        { targetType: audience },
        { targetType: "DEPARTMENT", departments: user.department || "" },
        { targetType: "DEPARTMENT", department: user.department || "" },
      ],
    }).populate("createdBy", "name").sort({ createdAt: -1 }).lean();
    return successResponse(res, { data: announcements });
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

module.exports = { getDepartments, createAnnouncement, listAdminAnnouncements, listVisibleAnnouncements };
