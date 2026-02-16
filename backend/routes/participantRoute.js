const express = require('express');
const authJWT = require('../middleware/authJWT');
const requireRole = require('../middleware/requireRole');
const {
    getPreferences,
    updatePreferences,
    getRegistrations,
    getTicket
} = require('../controllers/participantController');

const router = express.Router();

router.get('/preferences', authJWT, requireRole(['participant']), getPreferences);
router.put('/preferences', authJWT, requireRole(['participant']), updatePreferences);
router.get('/registrations', authJWT, requireRole(['participant']), getRegistrations);
router.get('/tickets/:id', authJWT, requireRole(['participant']), getTicket);

module.exports = router;
