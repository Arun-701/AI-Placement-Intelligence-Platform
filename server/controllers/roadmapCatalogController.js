const roadmapCatalogService = require('../services/roadmapCatalogService');

async function getDomains(req, res) {
  try {
    const data = roadmapCatalogService.listDomains();
    return res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function lookupDomain(req, res) {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ success: false, message: 'Missing query' });

    const key = roadmapCatalogService.findDomainKeyForQuery(query);
    if (!key) {
      return res.status(404).json({ success: false, message: 'Roadmap is currently unavailable for this domain.' });
    }

    // create or replace student's roadmap and return formatted roadmap
    const studentId = req.user && req.user.id;
    if (!studentId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const data = await roadmapCatalogService.createOrReplaceStudentRoadmap(studentId, key);
    return res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  getDomains,
  lookupDomain
};
