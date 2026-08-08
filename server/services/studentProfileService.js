const Student = require("../models/Student");
const Roadmap = require("../models/Roadmap");
const { getMissingProfileFields } = require("../validators/studentProfileValidator");

const PROFILE_FIELDS = [
  "fullName",
  "phone",
  "gender",
  "dateOfBirth",
  "department",
  "year",
  "cgpa",
  "college",
  "skills",
  "interests",
  "linkedin",
  "github",
  "leetcode",
  "hackerrank",
  "codechef"
];

const calculateProfileCompletion = (student) => {
  const missingFields = getMissingProfileFields(student);
  const completedFields = PROFILE_FIELDS.length - missingFields.length;
  const percentage = PROFILE_FIELDS.length === 0 ? 100 : Math.round((completedFields / PROFILE_FIELDS.length) * 100);

  return {
    percentage,
    missingFields,
    profileCompleted: percentage === 100
  };
};

const getStudentProfile = async (studentId) => {
  const student = await Student.findById(studentId)
    .select("fullName email phone gender dateOfBirth department year cgpa college skills interests linkedin github leetcode hackerrank codechef resume isVerified isActive assessmentsCompleted profileCompleted")
    .lean();
  if (!student) {
    throw new Error("Student not found");
  }

  const completion = calculateProfileCompletion(student);
  return {
    student: {
      fullName: student.fullName || "",
      email: student.email,
      phone: student.phone || "",
      gender: student.gender || "",
      dateOfBirth: student.dateOfBirth || null,
      department: student.department || "",
      year: student.year || null,
      cgpa: student.cgpa === undefined ? null : student.cgpa,
      college: student.college || "",
      skills: student.skills || [],
      interests: student.interests || [],
      linkedin: student.linkedin || "",
      github: student.github || "",
      leetcode: student.leetcode || "",
      hackerrank: student.hackerrank || "",
      codechef: student.codechef || "",
      resume: student.resume || "",
      emailVerified: student.isVerified,
      accountActive: student.isActive,
      assessmentsCompleted: student.assessmentsCompleted || 0,
      profileCompleted: completion.profileCompleted,
      profileCompletion: completion.percentage
    }
  };
};

const getStudentDashboard = async (studentId) => {
  const profile = await getStudentProfile(studentId);
  const roadmap = await Roadmap.findOne({ student: studentId }).lean();

  return {
   profileCompletion: profile.student.profileCompletion,
    resumeUploaded: Boolean(profile.student.resume),
    emailVerified: profile.student.emailVerified,
    codingProfilesConnected: Boolean(profile.student.github || profile.student.leetcode || profile.student.codechef || profile.student.hackerrank),
    assessmentsCompleted: profile.student.assessmentsCompleted || 0,
    roadmapAvailable: Boolean(roadmap)
  };
};

const updateStudentProfile = async (studentId, updates) => {
  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error("Student not found");
  }

  PROFILE_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      student[field] = updates[field];
    }
  });

  const completion = calculateProfileCompletion(student);
  student.profileCompleted = completion.profileCompleted;
  await student.save();

  return {
    student,
    profileCompletion: completion.percentage,
    missingFields: completion.missingFields
  };
};

const getProfileCompletionStatus = async (studentId) => {
  const student = await Student.findById(studentId).lean();
  if (!student) {
    throw new Error("Student not found");
  }

  return calculateProfileCompletion(student);
};

module.exports = {
  PROFILE_FIELDS,
  calculateProfileCompletion,
  getStudentProfile,
  getStudentDashboard,
  updateStudentProfile,
  getProfileCompletionStatus
};
