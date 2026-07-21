const express = require('express');
const router = express.Router();

const coursesController = require('./courses.controller');
const authMiddleware = require('../../middlewares/auth-middleware');
const requireRole = require('../../middlewares/role-middleware');

router.get('/', authMiddleware, coursesController.getCourses);
router.get('/:id', authMiddleware, coursesController.getCourseById);
router.post('/', authMiddleware, requireRole('admin'), coursesController.createCourse);
router.put('/:id', authMiddleware, requireRole('admin'), coursesController.updateCourse);
router.delete('/:id', authMiddleware, requireRole('admin'), coursesController.deleteCourse);

module.exports = router;
