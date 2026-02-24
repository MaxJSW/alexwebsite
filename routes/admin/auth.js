const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth');

router.post('/register', authController.register)
router.post('/connect', authController.connect)
router.post('/change-password', authController.changePassword);

module.exports = router;