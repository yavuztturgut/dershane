const express = require('express');
const authMiddleware = require('../../middlewares/auth-middleware');
const asyncHandler = require('../../middlewares/async-handler');
const attendanceController = require('./attendance.controller');

const router = express.Router();
router.get('/me', authMiddleware, asyncHandler(attendanceController.getMyAttendance));
router.get('/report/days', authMiddleware, asyncHandler(attendanceController.getDailyReport));
router.get('/report', authMiddleware, asyncHandler(attendanceController.getReport));

module.exports = router;
