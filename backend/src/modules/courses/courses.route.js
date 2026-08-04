const express = require('express');
const router = express.Router();

const coursesController = require('./courses.controller');
const authMiddleware = require('../../http/middleware/auth-middleware');
const requireRole = require('../../http/middleware/role-middleware');
const asyncHandler = require('../../http/middleware/async-handler');

router.get('/', authMiddleware, asyncHandler(coursesController.getCourses));
router.get('/:id', authMiddleware, asyncHandler(coursesController.getCourseById));
router.post('/', authMiddleware, requireRole('admin'), asyncHandler(coursesController.createCourse));
router.put('/:id', authMiddleware, requireRole('admin'), asyncHandler(coursesController.updateCourse));
router.delete('/:id', authMiddleware, requireRole('admin'), asyncHandler(coursesController.deleteCourse));

module.exports = router;
