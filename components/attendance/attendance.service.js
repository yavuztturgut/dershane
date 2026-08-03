const attendanceRepository = require('./attendance.repository');
const createHttpError = require('../../utils/create-http-error');

const statuses = new Set(['present', 'absent', 'late', 'excused']);

function assertViewer(schedule, user) {
    if (user.role_name === 'admin') return;
    if (user.role_name === 'teacher' && schedule.teacher_id === user.id) return;
    throw createHttpError('Attendance access forbidden', 403, 'FORBIDDEN');
}

async function getScheduleAttendance(scheduleId, user) {
    const schedule = await attendanceRepository.findSchedule(scheduleId);
    if (!schedule) throw createHttpError('Schedule not found', 404, 'SCHEDULE_NOT_FOUND');
    assertViewer(schedule, user);
    return { schedule, records: await attendanceRepository.findScheduleAttendance(scheduleId) };
}

async function saveScheduleAttendance(scheduleId, records, user) {
    const schedule = await attendanceRepository.findSchedule(scheduleId);
    if (!schedule) throw createHttpError('Schedule not found', 404, 'SCHEDULE_NOT_FOUND');
    assertViewer(schedule, user);
    const now = Date.now();
    if (user.role_name === 'teacher') {
        const startsAt = new Date(schedule.start_time).getTime();
        const locksAt = new Date(schedule.end_time).getTime() + 24 * 60 * 60 * 1000;
        if (now < startsAt) throw createHttpError('Attendance is not open yet', 409, 'ATTENDANCE_NOT_OPEN');
        if (now > locksAt) throw createHttpError('Attendance is locked', 409, 'ATTENDANCE_LOCKED');
    }
    if (!Array.isArray(records) || records.some((record) => !Number.isInteger(Number(record.student_id)) || !statuses.has(record.status))) {
        throw createHttpError('Attendance records are invalid', 400, 'INVALID_ATTENDANCE');
    }
    const available = await attendanceRepository.findScheduleAttendance(scheduleId);
    const studentIds = new Set(available.map((item) => item.student_id));
    if (records.some((record) => !studentIds.has(Number(record.student_id)))) {
        throw createHttpError('Student does not belong to this class', 400, 'INVALID_ATTENDANCE_STUDENT');
    }
    await attendanceRepository.upsertAttendance(
        scheduleId,
        records.map((record) => ({ ...record, student_id: Number(record.student_id) })),
        user.id
    );
    return getScheduleAttendance(scheduleId, user);
}

async function getMyAttendance(user, filters) {
    if (user.role_name !== 'student') throw createHttpError('Attendance access forbidden', 403, 'FORBIDDEN');
    const records = await attendanceRepository.findStudentAttendance(user.id, filters);
    const recorded = records.filter((item) => item.status);
    const counts = Object.fromEntries([...statuses].map((status) => [status, recorded.filter((item) => item.status === status).length]));
    return { records, summary: { total: recorded.length, ...counts } };
}

async function getReport(user, filters) {
    if (user.role_name !== 'admin') throw createHttpError('Attendance access forbidden', 403, 'FORBIDDEN');
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 25));
    const { items, total } = await attendanceRepository.findReport({ ...filters, page, pageSize });
    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

module.exports = { getScheduleAttendance, saveScheduleAttendance, getMyAttendance, getReport };
