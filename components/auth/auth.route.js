const express = require('express');
const router = express.Router();

const authController = require('./auth.controller');
const authMiddleware = require('../../middlewares/auth-middleware');
const asyncHandler = require('../../middlewares/async-handler');

router.post('/login', asyncHandler(authController.login));
router.get('/profile', authMiddleware, asyncHandler(authController.getProfile));

module.exports = router;
