const attendanceService = require('./attendance.service');

async function getScheduleAttendance(req, res) {
    res.json(await attendanceService.getScheduleAttendance(Number(req.params.id), req.user, req.query));
}

async function saveScheduleAttendance(req, res) {
    res.json(await attendanceService.saveScheduleAttendance(Number(req.params.id), req.body.records, req.user));
}

async function getMyAttendance(req, res) {
    res.json(await attendanceService.getMyAttendance(req.user, req.query));
}

async function getReport(req, res) {
    res.json(await attendanceService.getReport(req.user, req.query));
}

async function getDailyReport(req, res) {
    res.json(await attendanceService.getDailyReport(req.user, req.query));
}

module.exports = { getScheduleAttendance, saveScheduleAttendance, getMyAttendance, getReport, getDailyReport };
