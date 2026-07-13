const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/schedule-controller');
const authMiddleware = require('../middlewares/auth-middleware');
const requireRole = require('../middlewares/role-middleware');

router.get('/', authMiddleware, scheduleController.getSchedules);
router.get('/:id', authMiddleware, scheduleController.getScheduleById);
router.post('/', authMiddleware, requireRole('admin'), scheduleController.createSchedule);
router.put('/:id', authMiddleware, requireRole('admin'), scheduleController.updateSchedule);
router.delete('/:id', authMiddleware, requireRole('admin'), scheduleController.deleteSchedule);

module.exports = router;