const assert = require("assert");
const Admin = require("../models/Admin");
const Assessment = require("../models/Assessment");
const AssessmentAttendanceRequest = require("../models/AssessmentAttendanceRequest");
const AssessmentResult = require("../models/AssessmentResult");
const Faculty = require("../models/Faculty");
const Notification = require("../models/Notification");
const Roadmap = require("../models/Roadmap");
const Student = require("../models/Student");
const adminService = require("../services/adminService");
const notificationService = require("../services/notificationService");

const modelMethods = [
  [Student, "countDocuments"],
  [Student, "aggregate"],
  [Faculty, "countDocuments"],
  [Assessment, "countDocuments"],
  [Assessment, "aggregate"],
  [Roadmap, "countDocuments"],
  [Roadmap, "aggregate"],
  [AssessmentResult, "countDocuments"],
  [AssessmentAttendanceRequest, "countDocuments"],
  [AssessmentAttendanceRequest, "find"],
  [Admin, "find"],
  [Notification, "findOneAndUpdate"],
];
const originals = modelMethods.map(([model, method]) => model[method]);

const restoreMethods = () => modelMethods.forEach(([model, method], index) => {
  model[method] = originals[index];
});

const run = async () => {
  let pendingRequests = 1;
  let studentCountCall = 0;
  Student.countDocuments = async () => (++studentCountCall % 2 ? 10 : 8);
  Student.aggregate = async () => [];
  Faculty.countDocuments = async () => 0;
  Assessment.countDocuments = async () => 0;
  Assessment.aggregate = async () => [];
  Roadmap.countDocuments = async () => 0;
  Roadmap.aggregate = async () => [];
  AssessmentResult.countDocuments = async () => 0;
  AssessmentAttendanceRequest.countDocuments = async (query) => {
    assert.deepStrictEqual(query, { active: { $ne: false }, status: "Requested" });
    return pendingRequests;
  };

  const firstDashboard = await adminService.buildAdminDashboard();
  assert.strictEqual(firstDashboard.studentRequestCount, 1);
  pendingRequests = 0;
  const handledDashboard = await adminService.buildAdminDashboard();
  assert.strictEqual(handledDashboard.studentRequestCount, 0);

  const admins = ["admin-a", "admin-b"];
  Admin.find = () => ({
    select: () => ({
      lean: async () => admins.map((_id) => ({ _id })),
    }),
  });
  const storedNotifications = new Map();
  let insertedNotifications = 0;
  Notification.findOneAndUpdate = async (filter, update) => {
    const key = `${filter.recipient}:${filter["context.requestId"]}`;
    if (!storedNotifications.has(key)) {
      storedNotifications.set(key, { ...update.$setOnInsert, _id: `notification-${++insertedNotifications}` });
    }
    return storedNotifications.get(key);
  };
  const request = { _id: "request-1", setIndex: 0 };
  const assessment = { _id: "assessment-1", title: "Test 1" };
  const student = { _id: "student-1", name: "Shalini" };
  await notificationService.createAdminStudentRequestNotifications({ request, assessment, student });
  await notificationService.createAdminStudentRequestNotifications({ request, assessment, student });
  assert.strictEqual(storedNotifications.size, 2);
  assert.strictEqual(insertedNotifications, 2);
  assert.match([...storedNotifications.values()][0].message, /Shalini.*Test 1.*Admin action is required/);

  AssessmentAttendanceRequest.find = () => ({
    populate: () => ({
      populate: () => ({
        lean: async () => [{ ...request, assessment, student }],
      }),
    }),
  });
  await notificationService.ensurePendingStudentRequestNotifications();
  await notificationService.ensurePendingStudentRequestNotifications();
  assert.strictEqual(storedNotifications.size, 2);
  assert.strictEqual(insertedNotifications, 2);

  console.log("student request dashboard and notification tests passed");
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(restoreMethods);
