const express = require('express');
const { loginController, signupController, meController } = require('../controllers/authController');
const authJWT = require('../middleware/authJWT');
const verifyRecaptcha = require('../middleware/verifyRecaptcha');

const router = express.Router();

//routes
router.post('/login', verifyRecaptcha, loginController);
router.post('/signup', verifyRecaptcha, signupController);
router.get('/me', authJWT, meController);

module.exports = router;