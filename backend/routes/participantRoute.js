const express = require('express');
const authJWT = require('../middleware/authJWT');
const requireRole = require('../middleware/requireRole');
const {
    getPreferences,
    updatePreferences
} = require('../controllers/participantController');

const router = express.Router();

router.get('/preferences', authJWT, requireRole(['participant']), getPreferences);
router.put('/preferences', authJWT, requireRole(['participant']), updatePreferences);

module.exports = router;
