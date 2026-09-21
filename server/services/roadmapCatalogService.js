const path = require('path');
const fs = require('fs');
const Roadmap = require('../models/Roadmap');
const roadmapService = require('./roadmapService');

const DATA_PATH = path.join(__dirname, '..', 'data', 'roadmaps.json');

function loadCatalog() {
  if (!fs.existsSync(DATA_PATH)) return {};
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

const catalog = loadCatalog();

function normalize(text) {
  return (text || '').toString().trim().toLowerCase().replace(/[^a-z0-9 ]+/g, '');
}

function findDomainKeyForQuery(query) {
  const q = normalize(query);
  if (!q) return null;
  // exact key match
  if (catalog[q]) return q;
  // check aliases and keys
  for (const key of Object.keys(catalog)) {
    const entry = catalog[key];
    if (!entry) continue;
    if (normalize(entry.displayName) === q) return key;
    if (entry.aliases && entry.aliases.some(a => normalize(a) === q)) return key;
    // support short forms: token match
    if (q.length >= 2) {
      const tokens = q.split(/\s+/);
      for (const t of tokens) {
        if (entry.aliases && entry.aliases.some(a => normalize(a) === t)) return key;
      }
    }
  }
  return null;
}

async function createOrReplaceStudentRoadmap(studentId, domainKey) {
  const entry = catalog[domainKey];
  if (!entry) throw new Error('Domain not found');

  const roadmapItems = (entry.topics || []).map((t, idx) => ({
    title: t.title,
    description: t.description || '',
    learningResources: [],
    status: 'Pending'
  }));

  const payload = {
    student: studentId,
    careerGoal: entry.displayName,
    summary: `Standard roadmap for ${entry.displayName}`,
    roadmapItems,
    progress: {
      completionPercentage: 0,
      completedItems: 0,
      totalMilestones: roadmapItems.length
    }
  };

  // upsert the student's roadmap
  const updated = await Roadmap.findOneAndUpdate(
    { student: studentId },
    payload,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  // Use existing roadmapService to format the roadmap response if available
  try {
    const formatted = await roadmapService.getRoadmapByStudent(studentId);
    return formatted;
  } catch (err) {
    // fallback: return constructed payload format
    return {
      careerGoal: payload.careerGoal,
      roadmapItems: (updated.roadmapItems || []).map(item => ({
        _id: item._id || `${domainKey}-${Math.random().toString(36).slice(2,8)}`,
        title: item.title,
        description: item.description,
        learningResources: item.learningResources || [],
        status: item.status || 'Pending'
      })),
      progress: updated.progress || payload.progress
    };
  }
}

function listDomains() {
  return Object.keys(catalog).map(key => ({ key, displayName: catalog[key].displayName }));
}

module.exports = {
  findDomainKeyForQuery,
  createOrReplaceStudentRoadmap,
  listDomains
};
