const schedulesService = require('./schedules.service');

async function getSchedules(req, res) {
    const schedules = await schedulesService.getSchedules(req.user);
    res.json(schedules);
}

async function getScheduleById(req, res) {
    const { id } = req.params;
    const schedule = await schedulesService.getScheduleById(id, req.user);
    res.json(schedule);
}

async function createSchedule(req, res) {
    const schedule = await schedulesService.createSchedule(req.body);
    res.status(201).json(schedule);
}

async function updateSchedule(req, res) {
    const { id } = req.params;
    const schedule = await schedulesService.updateSchedule(id, req.body);
    res.json(schedule);
}

async function deleteSchedule(req, res) {
    const { id } = req.params;
    const schedule = await schedulesService.deleteSchedule(id);

    res.json({
        message: 'Schedule deleted successfully',
        schedule
    });
}

module.exports = {
    getSchedules,
    getScheduleById,
    createSchedule,
    updateSchedule,
    deleteSchedule
};
