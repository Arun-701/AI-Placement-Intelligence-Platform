const express = require('express');

const router = express.Router();

const controller = require('../controllers/roadmapCatalogController');

const verifyToken = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.get(
    '/roadmap/domains',
    verifyToken,
    authorizeRoles('student'),
    controller.getDomains
);

router.post(
    '/roadmap/lookup',
    verifyToken,
    authorizeRoles('student'),
    controller.lookupDomain
);

module.exports = router;