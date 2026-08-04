const express = require('express');
const authMiddleware = require('../../middlewares/auth-middleware');
const requireRole = require('../../middlewares/role-middleware');
const asyncHandler = require('../../middlewares/async-handler');
const lookupsController = require('./lookups.controller');

const router = express.Router();

router.get('/', authMiddleware, requireRole('admin'), asyncHandler(lookupsController.getLookups));

module.exports = router;
