const express = require('express');
const authMiddleware = require('../../http/middleware/auth-middleware');
const requireRole = require('../../http/middleware/role-middleware');
const asyncHandler = require('../../http/middleware/async-handler');
const lookupsController = require('./lookups.controller');

const router = express.Router();

router.get('/', authMiddleware, requireRole('admin'), asyncHandler(lookupsController.getLookups));

module.exports = router;
