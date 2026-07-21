const express = require('express');
const router = express.Router();

const rolesController = require('./roles.controller');
const authMiddleware = require('../../middlewares/auth-middleware');
const requireRole = require('../../middlewares/role-middleware');

router.get('/', authMiddleware, requireRole('admin'), rolesController.getRoles);
router.get('/:id', authMiddleware, requireRole('admin'), rolesController.getRoleById);
router.post('/', authMiddleware, requireRole('admin'), rolesController.createRole);
router.put('/:id', authMiddleware, requireRole('admin'), rolesController.updateRole);
router.delete('/:id', authMiddleware, requireRole('admin'), rolesController.deleteRole);

module.exports = router;
