const mongoose = require("mongoose");
const validator = require("validator");

const isValidObjectId = (value) => {
  return typeof value === "string" && mongoose.isValidObjectId(value);
};

const isValidEmail = (value) => {
  return typeof value === "string" && validator.isEmail(value.trim());
};

const isStrongPassword = (value) => {
  return typeof value === "string"
    && validator.isLength(value, { min: 8 })
    && /[A-Z]/.test(value)
    && /[a-z]/.test(value)
    && /\d/.test(value)
    && /[^A-Za-z0-9]/.test(value);
};

const sanitizeString = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const parsePagination = (query = {}) => {
  const page = Number.isInteger(Number(query.page)) && Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number.isInteger(Number(query.limit)) && Number(query.limit) > 0 ? Math.min(Number(query.limit), 100) : 20;
  return { page, limit, skip: (page - 1) * limit };
};

const parseSort = (query = {}, allowedFields = []) => {
  const sortBy = typeof query.sortBy === "string" && query.sortBy.trim() ? query.sortBy.trim() : "createdAt";
  const order = query.order === "asc" ? 1 : -1;
  const field = allowedFields.includes(sortBy) ? sortBy : "createdAt";
  return { [field]: order };
};

const isValidDateString = (value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

module.exports = {
  isValidObjectId,
  isValidEmail,
  isStrongPassword,
  sanitizeString,
  parsePagination,
  parseSort,
  isValidDateString
};
