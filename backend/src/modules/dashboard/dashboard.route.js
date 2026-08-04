const express = require('express');
const authMiddleware = require('../../http/middleware/auth-middleware');
const requireRole = require('../../http/middleware/role-middleware');
const asyncHandler = require('../../http/middleware/async-handler');
const dashboardController = require('./dashboard.controller');

const router = express.Router();
router.get('/summary', authMiddleware, requireRole('admin'), asyncHandler(dashboardController.getSummary));

module.exports = router;
