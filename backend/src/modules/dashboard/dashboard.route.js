const express = require('express');
const authMiddleware = require('../../middleware/auth-middleware');
const requireRole = require('../../middleware/role-middleware');
const asyncHandler = require('../../middleware/async-handler');
const dashboardController = require('./dashboard.controller');

const router = express.Router();
router.get('/summary', authMiddleware, requireRole('admin'), asyncHandler(dashboardController.getSummary));

module.exports = router;
