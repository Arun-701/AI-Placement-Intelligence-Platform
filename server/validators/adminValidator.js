const validateEmail = (email) => {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const isStrongPassword = (password) => {
  return typeof password === "string"
    && password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
};

const validateAdminRegistration = (payload) => {
  const errors = [];
  const data = {};

  if (!payload.name || typeof payload.name !== "string" || payload.name.trim().length < 2) {
    errors.push("Valid name is required");
  } else {
    data.name = payload.name.trim();
  }

  if (!validateEmail(payload.email)) {
    errors.push("Valid email is required");
  } else {
    data.email = payload.email.trim().toLowerCase();
  }

  if (!isStrongPassword(payload.password)) {
    errors.push("Password must be at least 8 characters and include uppercase, lowercase, number, and special character");
  } else {
    data.password = payload.password;
  }

  return { errors, data };
};

const validateAdminLogin = (payload) => {
  const errors = [];
  const data = {};

  if (!validateEmail(payload.email)) {
    errors.push("Valid email is required");
  } else {
    data.email = payload.email.trim().toLowerCase();
  }

  if (typeof payload.password !== "string" || payload.password.trim() === "") {
    errors.push("Password is required");
  } else {
    data.password = payload.password;
  }

  return { errors, data };
};

const validateStudentPayload = (payload, isUpdate = false) => {
  const errors = [];
  const data = {};

  if (!isUpdate || payload.name !== undefined) {
    if (!payload.name || typeof payload.name !== "string" || payload.name.trim().length < 2) {
      errors.push("Valid name is required");
    } else {
      data.name = payload.name.trim();
    }
  }

  if (!isUpdate || payload.email !== undefined) {
    if (!validateEmail(payload.email)) {
      errors.push("Valid email is required");
    } else {
      data.email = payload.email.trim().toLowerCase();
    }
  }

  if (!isUpdate || payload.password !== undefined) {
    if (!isUpdate && !isStrongPassword(payload.password)) {
      errors.push("Password must be at least 8 characters and include uppercase, lowercase, number, and special character");
    } else if (payload.password !== undefined) {
      if (!isStrongPassword(payload.password)) {
        errors.push("Password must be at least 8 characters and include uppercase, lowercase, number, and special character");
      } else {
        data.password = payload.password;
      }
    }
  }

  if (!isUpdate || payload.department !== undefined) {
    if (!payload.department || typeof payload.department !== "string" || payload.department.trim().length < 2) {
      errors.push("Valid department is required");
    } else {
      data.department = payload.department.trim();
    }
  }

  if (!isUpdate || payload.year !== undefined) {
    if (!Number.isInteger(payload.year) || payload.year < 1 || payload.year > 8) {
      errors.push("Year must be a whole number between 1 and 8");
    } else {
      data.year = payload.year;
    }
  }

  if (payload.section !== undefined) {
    if (typeof payload.section !== "string") {
      errors.push("Section must be a string");
    } else {
      data.section = payload.section.trim();
    }
  }

  if (payload.cgpa !== undefined) {
    if (!Number.isFinite(payload.cgpa) || payload.cgpa < 0 || payload.cgpa > 10) {
      errors.push("CGPA must be a number between 0 and 10");
    } else {
      data.cgpa = payload.cgpa;
    }
  }

  if (payload.studentId !== undefined) {
    if (typeof payload.studentId !== "string" || payload.studentId.trim().length === 0) {
      errors.push("studentId must be a non-empty string");
    } else {
      data.studentId = payload.studentId.trim();
    }
  }

  if (payload.skills !== undefined) {
    if (!Array.isArray(payload.skills) || payload.skills.some((item) => typeof item !== "string" || item.trim().length === 0)) {
      errors.push("Skills must be an array of non-empty strings");
    } else {
      data.skills = payload.skills.map((item) => item.trim());
    }
  }

  if (payload.isActive !== undefined) {
    if (typeof payload.isActive !== "boolean") {
      errors.push("isActive must be a boolean");
    } else {
      data.isActive = payload.isActive;
    }
  }

  if (payload.isVerified !== undefined) {
    if (typeof payload.isVerified !== "boolean") {
      errors.push("isVerified must be a boolean");
    } else {
      data.isVerified = payload.isVerified;
    }
  }

  return { errors, data };
};

const validateFacultyPayload = (payload, isUpdate = false) => {
  const errors = [];
  const data = {};

  if (!isUpdate || payload.name !== undefined) {
    if (!payload.name || typeof payload.name !== "string" || payload.name.trim().length < 2) {
      errors.push("Valid name is required");
    } else {
      data.name = payload.name.trim();
    }
  }

  if (!isUpdate || payload.email !== undefined) {
    if (!validateEmail(payload.email)) {
      errors.push("Valid email is required");
    } else {
      data.email = payload.email.trim().toLowerCase();
    }
  }

  if (!isUpdate || payload.password !== undefined) {
    if (!isUpdate && !isStrongPassword(payload.password)) {
      errors.push("Password must be at least 8 characters and include uppercase, lowercase, number, and special character");
    } else if (payload.password !== undefined) {
      if (!isStrongPassword(payload.password)) {
        errors.push("Password must be at least 8 characters and include uppercase, lowercase, number, and special character");
      } else {
        data.password = payload.password;
      }
    }
  }

  if (payload.department !== undefined) {
    if (!payload.department || typeof payload.department !== "string" || payload.department.trim().length < 2) {
      errors.push("Valid department is required");
    } else {
      data.department = payload.department.trim();
    }
  }

  if (payload.designation !== undefined) {
    if (!payload.designation || typeof payload.designation !== "string" || payload.designation.trim().length < 2) {
      errors.push("Valid designation is required");
    } else {
      data.designation = payload.designation.trim();
    }
  }

  if (payload.facultyId !== undefined) {
    if (typeof payload.facultyId !== "string" || payload.facultyId.trim().length === 0) {
      errors.push("facultyId must be a non-empty string");
    } else {
      data.facultyId = payload.facultyId.trim();
    }
  }

  if (payload.isActive !== undefined) {
    if (typeof payload.isActive !== "boolean") {
      errors.push("isActive must be a boolean");
    } else {
      data.isActive = payload.isActive;
    }
  }

  return { errors, data };
};

const validateAssignmentPayload = (payload) => {
  const errors = [];
  const data = {};

  if (!payload || !Array.isArray(payload.studentIds)) {
    errors.push("studentIds must be an array of student IDs");
    return { errors, data };
  }

  const studentIds = payload.studentIds.map((id) => (typeof id === "string" ? id.trim() : "")).filter(Boolean);

  if (studentIds.length === 0) {
    errors.push("At least one valid student ID is required");
  }

  data.studentIds = [...new Set(studentIds)];
  return { errors, data };
};

module.exports = {
  validateAdminRegistration,
  validateAdminLogin,
  validateStudentPayload,
  validateFacultyPayload,
  validateAssignmentPayload,
  validateEmail,
  isStrongPassword
};
