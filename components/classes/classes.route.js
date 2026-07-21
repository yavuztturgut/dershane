const express = require('express');
const router = express.Router();

const classesController = require('./classes.controller');
const authMiddleware = require('../../middlewares/auth-middleware');
const requireRole = require('../../middlewares/role-middleware');

router.get('/', authMiddleware, classesController.getClasses);
router.get('/:id', authMiddleware, classesController.getClassById);
router.post('/', authMiddleware, requireRole('admin'), classesController.createClass);
router.put('/:id', authMiddleware, requireRole('admin'), classesController.updateClass);
router.delete('/:id', authMiddleware, requireRole('admin'), classesController.deleteClass);

module.exports = router;
