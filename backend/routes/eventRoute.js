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
const {
    listMessages,
    createMessage,
    togglePinMessage,
    deleteMessage,
    reactToMessage
} = require('../controllers/forumController');

const router = express.Router();

router.get('/', browseEvents);
router.get('/:id', getEvent);
router.post('/:id/register', authJWT, requireRole(['participant']), upload.any(), registerForEvent);
router.post('/:id/purchase', authJWT, requireRole(['participant']), upload.single('paymentProof'), purchaseMerchandise);
router.post('/registrations/:registrationId/payment-proof', authJWT, requireRole(['participant']), upload.single('paymentProof'), uploadMerchandisePaymentProof);

router.get('/:id/forum/messages', authJWT, requireRole(['participant', 'organiser', 'admin']), listMessages);
router.post('/:id/forum/messages', authJWT, requireRole(['participant', 'organiser', 'admin']), createMessage);
router.post('/:id/forum/messages/:messageId/pin', authJWT, requireRole(['organiser', 'admin']), togglePinMessage);
router.delete('/:id/forum/messages/:messageId', authJWT, requireRole(['organiser', 'admin']), deleteMessage);
router.post('/:id/forum/messages/:messageId/react', authJWT, requireRole(['participant', 'organiser', 'admin']), reactToMessage);

module.exports = router;
