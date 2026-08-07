const express = require('express');
const asyncHandler = require('../../middleware/async-handler');
const cronAuthMiddleware = require('../../middleware/cron-auth-middleware');
const maintenanceController = require('./maintenance.controller');

const router = express.Router();

router.get('/database-keep-alive', cronAuthMiddleware, asyncHandler(maintenanceController.keepDatabaseAlive));

module.exports = router;
