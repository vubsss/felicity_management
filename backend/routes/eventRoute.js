const express = require('express');
const authJWT = require('../middleware/authJWT');
const requireRole = require('../middleware/requireRole');
const upload = require('../middleware/multerConfig');
const {
    browseEvents,
    getEvent,
    registerForEvent,
    purchaseMerchandise,
    uploadMerchandisePaymentProof
} = require('../controllers/eventController');

const router = express.Router();

router.get('/', browseEvents);
router.get('/:id', getEvent);
router.post('/:id/register', authJWT, requireRole(['participant']), upload.any(), registerForEvent);
router.post('/:id/purchase', authJWT, requireRole(['participant']), purchaseMerchandise);
router.post('/registrations/:registrationId/payment-proof', authJWT, requireRole(['participant']), upload.single('paymentProof'), uploadMerchandisePaymentProof);

module.exports = router;
