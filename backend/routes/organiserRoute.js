const express = require('express');
const authJWT = require('../middleware/authJWT');
const requireRole = require('../middleware/requireRole');
const {
    listPublicOrganisers,
    getPublicOrganiser,
    getProfile,
    updateProfile,
    getDashboard,
    listEvents,
    createEventDraft,
    getEvent,
    updateEvent,
    publishEvent,
    updateStatus,
    requestPasswordReset,
    getParticipants,
    exportParticipants,
    listPaymentApprovals,
    reviewPaymentApproval,
    getAttendanceDashboard,
    scanAttendance,
    manualAttendanceOverride,
    exportAttendance
} = require('../controllers/organiserController');

const router = express.Router();

router.get('/public', listPublicOrganisers);
router.get('/public/:id', getPublicOrganiser);

router.get('/me', authJWT, requireRole(['organiser']), getProfile);
router.put('/me', authJWT, requireRole(['organiser']), updateProfile);
router.get('/dashboard', authJWT, requireRole(['organiser']), getDashboard);

router.get('/events', authJWT, requireRole(['organiser']), listEvents);
router.post('/events', authJWT, requireRole(['organiser']), createEventDraft);
router.get('/events/:id', authJWT, requireRole(['organiser']), getEvent);
router.put('/events/:id', authJWT, requireRole(['organiser']), updateEvent);
router.post('/events/:id/publish', authJWT, requireRole(['organiser']), publishEvent);
router.post('/events/:id/status', authJWT, requireRole(['organiser']), updateStatus);
router.post('/password-reset-request', authJWT, requireRole(['organiser']), requestPasswordReset);
router.get('/events/:id/participants', authJWT, requireRole(['organiser']), getParticipants);
router.get('/events/:id/participants/export', authJWT, requireRole(['organiser']), exportParticipants);
router.get('/events/:id/payments', authJWT, requireRole(['organiser']), listPaymentApprovals);
router.post('/events/:id/payments/review', authJWT, requireRole(['organiser']), reviewPaymentApproval);
router.get('/events/:id/attendance', authJWT, requireRole(['organiser']), getAttendanceDashboard);
router.post('/events/:id/attendance/scan', authJWT, requireRole(['organiser']), scanAttendance);
router.post('/events/:id/attendance/manual', authJWT, requireRole(['organiser']), manualAttendanceOverride);
router.get('/events/:id/attendance/export', authJWT, requireRole(['organiser']), exportAttendance);

module.exports = router;
