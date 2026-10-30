const test = require("node:test");
const assert = require("node:assert/strict");
const Student = require("../models/Student");
const {
  calculateProfileCompletion,
  calculateProfileCompleteness,
  updateStudentProfile
} = require("../services/studentProfileService");
const { validateProfileInput } = require("../validators/studentProfileValidator");

test("profile validator normalizes supported profile fields", () => {
  const result = validateProfileInput({
    fullName: " Student Name ",
    phone: "9876543210",
    studentId: " REG-101 ",
    department: " Computer Science ",
    degree: " B.Tech ",
    year: 2,
    semester: 3,
    graduationYear: new Date().getFullYear() + 2,
    section: " a ",
    cgpa: 8.2,
    skills: ["React", " react ", "Node.js"],
    github: "github.com/student",
    linkedin: "https://linkedin.com/in/student",
    portfolio: "portfolio.example.com"
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.data.fullName, "Student Name");
  assert.equal(result.data.studentId, "REG-101");
  assert.equal(result.data.section, "A");
  assert.deepEqual(result.data.skills, ["React", "Node.js"]);
  assert.equal(result.data.github, "https://github.com/student");
  assert.equal(result.data.portfolio, "https://portfolio.example.com");
});

test("profile validator rejects invalid phone, academic values and URLs", () => {
  const result = validateProfileInput({
    phone: "123",
    semester: 17,
    graduationYear: 1900,
    cgpa: 10.1,
    github: "javascript:alert(1)"
  });

  assert.ok(result.errors.length >= 5);
});

test("profile completion uses saved profile data and resume status", () => {
  const student = {
    fullName: "Student Name",
    isVerified: true,
    phone: "9876543210",
    studentId: "REG-101",
    college: "Example College",
    department: "Computer Science",
    degree: "B.Tech",
    year: 2,
    semester: 3,
    section: "A",
    cgpa: 8.2,
    graduationYear: 2028,
    skills: ["React"],
    github: "https://github.com/student",
    linkedin: "https://linkedin.com/in/student",
    portfolio: "https://portfolio.example.com",
    resume: "uploads/resumes/student.pdf"
  };

  assert.deepEqual(calculateProfileCompleteness(student), { percentage: 100, missingFields: [] });
  const withoutResume = calculateProfileCompleteness({ ...student, resume: "" });
  assert.equal(withoutResume.percentage, 94);
  assert.deepEqual(withoutResume.missingFields, ["Resume"]);
});

test("the existing onboarding completion criteria remain unchanged", () => {
  const student = {
    fullName: "Student Name",
    phone: "9876543210",
    college: "Example College",
    section: "A",
    github: "https://github.com/student",
    linkedin: "https://linkedin.com/in/student",
    skills: ["React"],
    cgpa: 8.2
  };

  assert.equal(calculateProfileCompletion(student).percentage, 100);
  assert.equal(calculateProfileCompletion(student).profileCompleted, true);
});

test("duplicate registration numbers are rejected before saving the student", async () => {
  const originalFindById = Student.findById;
  const originalExists = Student.exists;
  const currentStudent = {
    _id: "current-student",
    studentId: "REG-OLD",
    save: async () => {
      throw new Error("A duplicate registration number must not be saved.");
    }
  };

  Student.findById = async () => currentStudent;
  Student.exists = async (query) => {
    assert.deepEqual(query, {
      studentId: "REG-TAKEN",
      _id: { $ne: "current-student" }
    });
    return { _id: "another-student" };
  };

  try {
    await assert.rejects(
      updateStudentProfile("current-student", { studentId: "REG-TAKEN" }),
      { code: "DUPLICATE_STUDENT_ID" }
    );
  } finally {
    Student.findById = originalFindById;
    Student.exists = originalExists;
  }
});
