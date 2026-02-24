const express = require('express');
const authJWT = require('../middleware/authJWT');
const requireRole = require('../middleware/requireRole');
const {
    getProfile,
    updateProfile,
    changePassword,
    getPreferences,
    updatePreferences,
    getRegistrations,
    getNotifications,
    getUnreadNotificationCount,
    markNotificationsRead,
    getTicket,
    cancelRegistration,
    followOrganiser,
    unfollowOrganiser
} = require('../controllers/participantController');

const router = express.Router();

router.get('/preferences', authJWT, requireRole(['participant']), getPreferences);
router.put('/preferences', authJWT, requireRole(['participant']), updatePreferences);
router.get('/me', authJWT, requireRole(['participant']), getProfile);
router.put('/me', authJWT, requireRole(['participant']), updateProfile);
router.post('/password', authJWT, requireRole(['participant']), changePassword);
router.get('/registrations', authJWT, requireRole(['participant']), getRegistrations);
router.get('/notifications', authJWT, requireRole(['participant']), getNotifications);
router.get('/notifications/unread-count', authJWT, requireRole(['participant']), getUnreadNotificationCount);
router.post('/notifications/mark-read', authJWT, requireRole(['participant']), markNotificationsRead);
router.post('/registrations/:id/cancel', authJWT, requireRole(['participant']), cancelRegistration);
router.get('/tickets/:id', authJWT, requireRole(['participant']), getTicket);
router.post('/follow/:id', authJWT, requireRole(['participant']), followOrganiser);
router.delete('/follow/:id', authJWT, requireRole(['participant']), unfollowOrganiser);

module.exports = router;
