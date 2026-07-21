const express = require('express');
const router = express.Router();

const usersController = require('./users.controller');
const authMiddleware = require('../../middlewares/auth-middleware');
const requireRole = require('../../middlewares/role-middleware');

router.get('/', authMiddleware, requireRole('admin'), usersController.getUsers);
router.get('/:id', authMiddleware, requireRole('admin'), usersController.getUserById);
router.post('/', authMiddleware, requireRole('admin'), usersController.createUser);
router.put('/:id', authMiddleware, requireRole('admin'), usersController.updateUser);
router.delete('/:id', authMiddleware, requireRole('admin'), usersController.deleteUser);

module.exports = router;
