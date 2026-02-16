const express = require('express');
const authJWT = require('../middleware/authJWT');
const requireRole = require('../middleware/requireRole');
const {
    getProfile,
    updateProfile,
    getDashboard,
    listEvents,
    createEventDraft,
    getEvent,
    updateEvent,
    publishEvent,
    updateStatus,
    getParticipants,
    exportParticipants
} = require('../controllers/organiserController');

const router = express.Router();

router.get('/me', authJWT, requireRole(['organiser']), getProfile);
router.put('/me', authJWT, requireRole(['organiser']), updateProfile);
router.get('/dashboard', authJWT, requireRole(['organiser']), getDashboard);

router.get('/events', authJWT, requireRole(['organiser']), listEvents);
router.post('/events', authJWT, requireRole(['organiser']), createEventDraft);
router.get('/events/:id', authJWT, requireRole(['organiser']), getEvent);
router.put('/events/:id', authJWT, requireRole(['organiser']), updateEvent);
router.post('/events/:id/publish', authJWT, requireRole(['organiser']), publishEvent);
router.post('/events/:id/status', authJWT, requireRole(['organiser']), updateStatus);
router.get('/events/:id/participants', authJWT, requireRole(['organiser']), getParticipants);
router.get('/events/:id/participants/export', authJWT, requireRole(['organiser']), exportParticipants);

module.exports = router;
