const express = require('express');
const router = express.Router();

const schedulesController = require('./schedules.controller');
const authMiddleware = require('../../middlewares/auth-middleware');
const requireRole = require('../../middlewares/role-middleware');

router.get('/', authMiddleware, schedulesController.getSchedules);
router.get('/:id', authMiddleware, schedulesController.getScheduleById);
router.post('/', authMiddleware, requireRole('admin'), schedulesController.createSchedule);
router.put('/:id', authMiddleware, requireRole('admin'), schedulesController.updateSchedule);
router.delete('/:id', authMiddleware, requireRole('admin'), schedulesController.deleteSchedule);

module.exports = router;
