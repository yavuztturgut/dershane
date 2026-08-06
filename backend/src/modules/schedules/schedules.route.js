const express = require('express');
const router = express.Router();

const schedulesController = require('./schedules.controller');
const authMiddleware = require('../../middleware/auth-middleware');
const requireRole = require('../../middleware/role-middleware');
const asyncHandler = require('../../middleware/async-handler');
const attendanceController = require('../attendance/attendance.controller');

router.get('/', authMiddleware, asyncHandler(schedulesController.getSchedules));
router.get('/:id/attendance', authMiddleware, asyncHandler(attendanceController.getScheduleAttendance));
router.put('/:id/attendance', authMiddleware, asyncHandler(attendanceController.saveScheduleAttendance));
router.get('/:id', authMiddleware, asyncHandler(schedulesController.getScheduleById));
router.post('/', authMiddleware, requireRole('admin'), asyncHandler(schedulesController.createSchedule));
router.put('/:id', authMiddleware, requireRole('admin'), asyncHandler(schedulesController.updateSchedule));
router.delete('/:id', authMiddleware, requireRole('admin'), asyncHandler(schedulesController.deleteSchedule));

module.exports = router;
