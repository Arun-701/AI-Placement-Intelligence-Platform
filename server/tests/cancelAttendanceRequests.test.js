const assert = require("assert");
const mongoose = require("mongoose");
const Assessment = require("../models/Assessment");
const AssessmentAttendanceRequest = require("../models/AssessmentAttendanceRequest");
const notificationService = require("../services/notificationService");

const originalAssessmentFindOne = Assessment.findOne;
const originalRequestFind = AssessmentAttendanceRequest.find;
const originalRequestUpdateMany = AssessmentAttendanceRequest.updateMany;
const originalCreateNotification = notificationService.createNotification;
const originalMarkHandled = notificationService.markAdminStudentRequestNotificationsHandled;

const run = async () => {
  let savedRequestUpdate;
  const assessmentId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const student = { _id: studentId, name: "Shalini" };
  const request = { _id: requestId, student };
  Assessment.findOne = () => ({
    select: async () => ({ _id: assessmentId, title: "Test 1", assignedFaculty: null }),
  });
  AssessmentAttendanceRequest.find = () => ({
    populate: async () => [request],
  });
  AssessmentAttendanceRequest.updateMany = async (filter, update) => {
    savedRequestUpdate = { filter, update };
    return { modifiedCount: 1 };
  };

  const handledIds = [];
  notificationService.markAdminStudentRequestNotificationsHandled = async (ids) => handledIds.push(...ids);
  const studentNotifications = [];
  notificationService.createNotification = async (notification) => studentNotifications.push(notification);
  const controller = require("../controllers/adminAssessmentController");

  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
  await controller.cancelAttendanceRequests({
    params: { id: assessmentId.toString() },
    body: { studentIds: [studentId.toString()] },
    user: { id: "admin-1", role: "admin" },
  }, response);

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.payload.success, true);
  assert.deepStrictEqual(savedRequestUpdate.update.$set.status, "Cancelled");
  assert.strictEqual(savedRequestUpdate.filter.status, "Requested");
  assert.deepStrictEqual(handledIds.map(String), [requestId.toString()]);
  assert.strictEqual(studentNotifications.length, 1);
  assert.strictEqual(String(studentNotifications[0].recipient), studentId.toString());
  assert.match(studentNotifications[0].message, /Your retest request for Test 1 was cancelled by the administrator/);
  assert.ok(AssessmentAttendanceRequest.schema.path("status").enumValues.includes("Cancelled"));
  console.log("attendance request cancellation test passed");
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  Assessment.findOne = originalAssessmentFindOne;
  AssessmentAttendanceRequest.find = originalRequestFind;
  AssessmentAttendanceRequest.updateMany = originalRequestUpdateMany;
  notificationService.createNotification = originalCreateNotification;
  notificationService.markAdminStudentRequestNotificationsHandled = originalMarkHandled;
});
