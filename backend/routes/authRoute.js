const express = require('express');
const { loginController, signupController, meController } = require('../controllers/authController');
const authJWT = require('../middleware/authJWT');

const router = express.Router();

//routes
router.post('/login', loginController);
router.post('/signup', signupController);
router.get('/me', authJWT, meController);

module.exports = router;