const express = require('express');
const router = express.Router();

const rolesController = require('./roles.controller');
const authMiddleware = require('../../middleware/auth-middleware');
const requireRole = require('../../middleware/role-middleware');
const asyncHandler = require('../../middleware/async-handler');

router.get('/', authMiddleware, requireRole('admin'), asyncHandler(rolesController.getRoles));
router.get('/:id', authMiddleware, requireRole('admin'), asyncHandler(rolesController.getRoleById));
router.post('/', authMiddleware, requireRole('admin'), asyncHandler(rolesController.createRole));
router.put('/:id', authMiddleware, requireRole('admin'), asyncHandler(rolesController.updateRole));
router.delete('/:id', authMiddleware, requireRole('admin'), asyncHandler(rolesController.deleteRole));

module.exports = router;
