const express = require('express');
const router = express.Router();

const authController = require('./auth.controller');
const authMiddleware = require('../../middleware/auth-middleware');
const asyncHandler = require('../../middleware/async-handler');
const createRateLimit = require('../../middleware/rate-limit');

const forgotIpLimit = createRateLimit({ windowMs: 15 * 60 * 1000, limit: 5 });
const forgotEmailLimit = createRateLimit({
    windowMs: 60 * 1000,
    limit: 1,
    key: (req) => String(req.body.email || '').trim().toLowerCase() || req.ip
});
const credentialLimit = createRateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });

router.post('/login', credentialLimit, asyncHandler(authController.login));
router.get('/profile', authMiddleware, asyncHandler(authController.getProfile));
router.patch('/profile', authMiddleware, asyncHandler(authController.updateProfile));
router.post('/change-password', authMiddleware, asyncHandler(authController.changePassword));
router.post('/forgot-password', forgotIpLimit, forgotEmailLimit, asyncHandler(authController.forgotPassword));
router.post('/reset-password', credentialLimit, asyncHandler(authController.resetPassword));
router.post('/logout', authController.logout);

module.exports = router;
