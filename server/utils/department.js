const normalizeDepartment = (department) =>
  String(department || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getDepartmentQuery = (department) => {
  const normalized = String(department || "").trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  return new RegExp(`^\\s*${normalized.split(" ").map(escapeRegExp).join("\\s+")}\\s*$`, "i");
};

module.exports = { normalizeDepartment, getDepartmentQuery };
