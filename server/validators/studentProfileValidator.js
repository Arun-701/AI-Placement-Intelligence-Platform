// Student profiles use Indian mobile numbers: exactly 10 digits starting with 6-9.
const phoneRegex = /^[6-9]\d{9}$/;

const profileFields = [
  "fullName",
  "phone",
  "studentId",
  "college",
  "department",
  "degree",
  "year",
  "semester",
  "section",
  "graduationYear",
  "github",
  "linkedin",
  "portfolio",
  "skills",
  "cgpa"
];

const normalizeUrl = (value) => {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".")
      ? candidate
      : null;
  } catch {
    return null;
  }
};

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
      errors.push("phone must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9");
    } else {
      data.phone = payload.phone.trim();
    }
  }

  if (payload.studentId !== undefined) {
    if (typeof payload.studentId !== "string" || payload.studentId.trim().length > 64) {
      errors.push("studentId must be a string of 64 characters or fewer");
    } else {
      data.studentId = payload.studentId.trim() || null;
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

  if (payload.degree !== undefined) {
    if (typeof payload.degree !== "string" || payload.degree.trim().length > 100) {
      errors.push("degree must be a string of 100 characters or fewer");
    } else {
      data.degree = payload.degree.trim();
    }
  }

  if (payload.year !== undefined) {
    const year = payload.year === "" || payload.year === null ? null : Number(payload.year);
    if (year !== null && (!Number.isInteger(year) || year < 1 || year > 8)) {
      errors.push("year must be a whole number between 1 and 8");
    } else if (year !== null) {
      data.year = year;
    }
  }

  if (payload.semester !== undefined) {
    const semester = payload.semester === "" || payload.semester === null ? null : Number(payload.semester);
    if (semester !== null && (!Number.isInteger(semester) || semester < 1 || semester > 16)) {
      errors.push("semester must be a whole number between 1 and 16");
    } else {
      data.semester = semester;
    }
  }

  if (payload.graduationYear !== undefined) {
    const graduationYear = payload.graduationYear === "" || payload.graduationYear === null
      ? null
      : Number(payload.graduationYear);
    const latestYear = new Date().getFullYear() + 10;
    if (graduationYear !== null && (!Number.isInteger(graduationYear) || graduationYear < 1950 || graduationYear > latestYear)) {
      errors.push(`graduationYear must be a whole year between 1950 and ${latestYear}`);
    } else {
      data.graduationYear = graduationYear;
    }
  }

  if (payload.cgpa !== undefined) {
    const cgpa = payload.cgpa === "" || payload.cgpa === null ? null : Number(payload.cgpa);
    if (cgpa !== null && (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10)) {
      errors.push("cgpa must be a number between 0 and 10");
    } else {
      data.cgpa = cgpa;
    }
  }

  if (payload.college !== undefined) {
    if (typeof payload.college !== "string" || (payload.college.trim() !== "" && payload.college.trim().length < 2)) {
      errors.push("college must be empty or at least 2 characters");
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
        const seen = new Set();
        data[field] = payload[field].map((item) => item.trim()).filter((item) => {
          const key = item.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
    }
  });

  const urlFields = ["linkedin", "github", "portfolio"];
  urlFields.forEach((field) => {
    if (payload[field] !== undefined) {
      if (typeof payload[field] !== "string") {
        errors.push(`${field} must be a URL`);
      } else if (payload[field].trim().length === 0) {
        data[field] = "";
      } else if (!normalizeUrl(payload[field].trim())) {
        errors.push(`${field} must be a valid URL`);
      } else {
        data[field] = normalizeUrl(payload[field].trim());
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
