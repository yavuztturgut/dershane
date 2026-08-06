const express = require('express');
const authMiddleware = require('../../middleware/auth-middleware');
const requireRole = require('../../middleware/role-middleware');
const asyncHandler = require('../../middleware/async-handler');
const lookupsController = require('./lookups.controller');

const router = express.Router();

router.get('/', authMiddleware, requireRole('admin'), asyncHandler(lookupsController.getLookups));

module.exports = router;
