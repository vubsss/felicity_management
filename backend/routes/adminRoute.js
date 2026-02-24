const express = require('express');
const authJWT = require('../middleware/authJWT');
const requireRole = require('../middleware/requireRole');
const {
    getDashboardStats,
    listOrganisers,
    createOrganiser,
    updateOrganiserStatus,
    deleteOrganiser,
    listResetRequests,
    resolveResetRequest,
    forceResetPassword
} = require('../controllers/adminController');

const router = express.Router();

router.get('/stats', authJWT, requireRole(['admin']), getDashboardStats);
router.get('/organisers', authJWT, requireRole(['admin']), listOrganisers);
router.post('/organisers', authJWT, requireRole(['admin']), createOrganiser);
router.patch('/organisers/:id/status', authJWT, requireRole(['admin']), updateOrganiserStatus);
router.delete('/organisers/:id', authJWT, requireRole(['admin']), deleteOrganiser);
router.post('/organisers/:id/reset-password', authJWT, requireRole(['admin']), forceResetPassword);

router.get('/password-resets', authJWT, requireRole(['admin']), listResetRequests);
router.post('/password-resets/:id/resolve', authJWT, requireRole(['admin']), resolveResetRequest);

module.exports = router;
