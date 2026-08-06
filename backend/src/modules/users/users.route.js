const express = require('express');
const router = express.Router();

const usersController = require('./users.controller');
const authMiddleware = require('../../middleware/auth-middleware');
const requireRole = require('../../middleware/role-middleware');
const asyncHandler = require('../../middleware/async-handler');

router.get('/', authMiddleware, requireRole('admin'), asyncHandler(usersController.getUsers));
router.get('/options', authMiddleware, requireRole('admin'), asyncHandler(usersController.getUserOptions));
router.get('/:id', authMiddleware, requireRole('admin'), asyncHandler(usersController.getUserById));
router.post('/', authMiddleware, requireRole('admin'), asyncHandler(usersController.createUser));
router.put('/:id', authMiddleware, requireRole('admin'), asyncHandler(usersController.updateUser));
router.delete('/:id', authMiddleware, requireRole('admin'), asyncHandler(usersController.deleteUser));

module.exports = router;
