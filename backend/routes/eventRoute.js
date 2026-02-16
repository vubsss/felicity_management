const express = require('express');
const authJWT = require('../middleware/authJWT');
const requireRole = require('../middleware/requireRole');
const {
    browseEvents,
    getEvent,
    registerForEvent,
    purchaseMerchandise
} = require('../controllers/eventController');

const router = express.Router();

router.get('/', browseEvents);
router.get('/:id', getEvent);
router.post('/:id/register', authJWT, requireRole(['participant']), registerForEvent);
router.post('/:id/purchase', authJWT, requireRole(['participant']), purchaseMerchandise);

module.exports = router;
