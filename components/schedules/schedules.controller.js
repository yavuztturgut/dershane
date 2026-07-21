const schedulesService = require('./schedules.service');

function sendError(res, error) {
    console.error(error);

    if (error.code === '23503') {
        return res.status(400).json({ error: 'Invalid course_id, class_id or teacher_id' });
    }

    if (error.code === '23514') {
        return res.status(400).json({ error: 'end_time must be greater than start_time' });
    }

    res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
}

async function getSchedules(req, res) {
    try {
        const schedules = await schedulesService.getSchedules(req.user);
        res.json(schedules);
    } catch (error) {
        sendError(res, error);
    }
}

async function getScheduleById(req, res) {
    try {
        const { id } = req.params;
        const schedule = await schedulesService.getScheduleById(id, req.user);
        res.json(schedule);
    } catch (error) {
        sendError(res, error);
    }
}

async function createSchedule(req, res) {
    try {
        const schedule = await schedulesService.createSchedule(req.body);
        res.status(201).json(schedule);
    } catch (error) {
        sendError(res, error);
    }
}

async function updateSchedule(req, res) {
    try {
        const { id } = req.params;
        const schedule = await schedulesService.updateSchedule(id, req.body);
        res.json(schedule);
    } catch (error) {
        sendError(res, error);
    }
}

async function deleteSchedule(req, res) {
    try {
        const { id } = req.params;
        const schedule = await schedulesService.deleteSchedule(id);

        res.json({
            message: 'Schedule deleted successfully',
            schedule
        });
    } catch (error) {
        sendError(res, error);
    }
}

module.exports = {
    getSchedules,
    getScheduleById,
    createSchedule,
    updateSchedule,
    deleteSchedule
};
