const express = require('express');
const authMiddleware = require('../../middlewares/auth-middleware');
const requireRole = require('../../middlewares/role-middleware');
const asyncHandler = require('../../middlewares/async-handler');
const dashboardController = require('./dashboard.controller');

const router = express.Router();
router.get('/summary', authMiddleware, requireRole('admin'), asyncHandler(dashboardController.getSummary));

module.exports = router;
