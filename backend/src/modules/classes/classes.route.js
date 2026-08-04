const express = require('express');
const router = express.Router();

const classesController = require('./classes.controller');
const authMiddleware = require('../../http/middleware/auth-middleware');
const requireRole = require('../../http/middleware/role-middleware');
const asyncHandler = require('../../http/middleware/async-handler');

router.get('/', authMiddleware, asyncHandler(classesController.getClasses));
router.get('/:id', authMiddleware, asyncHandler(classesController.getClassById));
router.post('/', authMiddleware, requireRole('admin'), asyncHandler(classesController.createClass));
router.put('/:id', authMiddleware, requireRole('admin'), asyncHandler(classesController.updateClass));
router.delete('/:id', authMiddleware, requireRole('admin'), asyncHandler(classesController.deleteClass));

module.exports = router;
