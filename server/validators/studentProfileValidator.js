const urlRegex = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[^\s]*)?$/;
const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;

const profileFields = [
  // Fields shown on the onboarding profile page
  "fullName",
  "phone",
  "college",
  "section",
  "github",
  "linkedin",
  "skills",
  "cgpa"
];

const validateProfileInput = (payload) => {
  const errors = [];
  const data = {};

  if (payload.fullName !== undefined) {
    if (typeof payload.fullName !== "string" || payload.fullName.trim().length < 2) {
      errors.push("fullName must be at least 2 characters");
    } else {
      data.fullName = payload.fullName.trim();
    }
  }

  if (payload.phone !== undefined) {
    if (typeof payload.phone !== "string" || !phoneRegex.test(payload.phone.trim())) {
      errors.push("phone must be a valid phone number");
    } else {
      data.phone = payload.phone.trim();
    }
  }

  if (payload.gender !== undefined) {
    const normalized = String(payload.gender).trim().toLowerCase();
    const validGenders = ["male", "female", "other", "prefer not to say", "non-binary", ""];
    if (!validGenders.includes(normalized)) {
      errors.push("gender must be one of male, female, other, prefer not to say, non-binary");
    } else {
      data.gender = normalized;
    }
  }

  if (payload.dateOfBirth !== undefined) {
    const date = new Date(payload.dateOfBirth);
    if (Number.isNaN(date.getTime())) {
      errors.push("dateOfBirth must be a valid date");
    } else {
      data.dateOfBirth = date;
    }
  }

  if (payload.department !== undefined) {
    if (typeof payload.department !== "string" || payload.department.trim().length < 2) {
      errors.push("department must be at least 2 characters");
    } else {
      data.department = payload.department.trim();
    }
  }

  if (payload.year !== undefined) {
    if (!Number.isInteger(payload.year) || payload.year < 1 || payload.year > 8) {
      errors.push("year must be a whole number between 1 and 8");
    } else {
      data.year = payload.year;
    }
  }

  if (payload.cgpa !== undefined) {
    if (!Number.isFinite(payload.cgpa) || payload.cgpa < 0 || payload.cgpa > 10) {
      errors.push("cgpa must be a number between 0 and 10");
    } else {
      data.cgpa = payload.cgpa;
    }
  }

  if (payload.college !== undefined) {
    if (typeof payload.college !== "string" || payload.college.trim().length < 2) {
      errors.push("college must be at least 2 characters");
    } else {
      data.college = payload.college.trim();
    }
  }

  if (payload.section !== undefined) {
    if (typeof payload.section !== "string") {
      errors.push("section must be a string");
    } else {
      data.section = payload.section.trim().toUpperCase();
    }
  }

  const stringArrayFields = ["skills", "interests"];
  stringArrayFields.forEach((field) => {
    if (payload[field] !== undefined) {
      if (!Array.isArray(payload[field]) || payload[field].some((item) => typeof item !== "string" || item.trim().length === 0)) {
        errors.push(`${field} must be an array of non-empty strings`);
      } else {
        data[field] = payload[field].map((item) => item.trim());
      }
    }
  });

  const urlFields = ["linkedin", "github", "leetcode", "hackerrank", "codechef"];
  urlFields.forEach((field) => {
    if (payload[field] !== undefined) {
      if (typeof payload[field] !== "string" || payload[field].trim().length === 0) {
        data[field] = "";
      } else if (!urlRegex.test(payload[field].trim())) {
        errors.push(`${field} must be a valid URL`);
      } else {
        data[field] = payload[field].trim();
      }
    }
  });

  return { errors, data };
};

const getMissingProfileFields = (student) => {
  const requiredFields = [
    "fullName",
    "phone",
    "college",
    "section",
    "github",
    "linkedin",
    "skills",
    "cgpa"
  ];

  return requiredFields.filter((field) => {
    const value = student[field];
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    if (typeof value === "string") {
      return value.trim() === "";
    }
    return value === null || value === undefined;
  });
};

module.exports = {
  validateProfileInput,
  getMissingProfileFields,
  profileFields
};
