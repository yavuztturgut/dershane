const express = require('express');
const router = express.Router();

const schedulesController = require('./schedules.controller');
const authMiddleware = require('../../middlewares/auth-middleware');
const requireRole = require('../../middlewares/role-middleware');
const asyncHandler = require('../../middlewares/async-handler');

router.get('/', authMiddleware, asyncHandler(schedulesController.getSchedules));
router.get('/:id', authMiddleware, asyncHandler(schedulesController.getScheduleById));
router.post('/', authMiddleware, requireRole('admin'), asyncHandler(schedulesController.createSchedule));
router.put('/:id', authMiddleware, requireRole('admin'), asyncHandler(schedulesController.updateSchedule));
router.delete('/:id', authMiddleware, requireRole('admin'), asyncHandler(schedulesController.deleteSchedule));

module.exports = router;
