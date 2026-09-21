const taxonomy = require("../../data/taxonomy.json");
const roadmaps = require("../../data/roadmaps.json");

const normalizeKey = (value) => String(value || "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const canonicalTopics = [...new Set([
  ...Object.values(roadmaps).flatMap((roadmap) => [roadmap.displayName, ...(roadmap.topics || []).map((topic) => topic.title)]),
  ...(taxonomy.extraTopics || []),
  ...Object.values(taxonomy.topicAliases || {}),
  "MongoDB",
  "SQL Query Clauses",
  "SELECT"
])].sort();

const topicLookup = new Map(canonicalTopics.map((topic) => [normalizeKey(topic), topic]));
Object.entries(taxonomy.topicAliases || {}).forEach(([alias, topic]) => {
  const canonical = topicLookup.get(normalizeKey(topic));
  if (canonical) topicLookup.set(normalizeKey(alias), canonical);
});

const invalidTopics = new Set((taxonomy.invalidTopics || []).map(normalizeKey));

const normalizeTopic = (value) => {
  const key = normalizeKey(value);
  return !key || invalidTopics.has(key) ? "" : topicLookup.get(key) || "";
};

const getCanonicalTopics = () => [...canonicalTopics];

module.exports = { getCanonicalTopics, normalizeKey, normalizeTopic };
