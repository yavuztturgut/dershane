const attendanceRepository = require('./attendance.repository');
const createHttpError = require('../../shared/errors/create-http-error');
const { formatIstanbulDateKey } = require('../../shared/time/istanbul-date-time');

const statuses = new Set(['present', 'absent', 'late', 'excused']);

function assertViewer(schedule, user) {
    if (user.role_name === 'admin') return;
    if (user.role_name === 'teacher' && schedule.teacher_id === user.id) return;
    throw createHttpError('Attendance access forbidden', 403, 'FORBIDDEN');
}

async function getScheduleAttendance(scheduleId, user, filters = {}) {
    const schedule = await attendanceRepository.findSchedule(scheduleId);
    if (!schedule) throw createHttpError('Schedule not found', 404, 'SCHEDULE_NOT_FOUND');
    assertViewer(schedule, user);
    const studentId = user.role_name === 'admin' && filters.student_id ? Number(filters.student_id) : undefined;
    if (studentId !== undefined && !Number.isInteger(studentId)) {
        throw createHttpError('student_id is invalid', 400, 'INVALID_STUDENT');
    }
    return { schedule, records: await attendanceRepository.findScheduleAttendance(scheduleId, studentId) };
}

async function saveScheduleAttendance(scheduleId, records, user, filters = {}) {
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
    return getScheduleAttendance(scheduleId, user, filters);
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

async function getDailyReport(user, filters) {
    if (user.role_name !== 'admin') throw createHttpError('Attendance access forbidden', 403, 'FORBIDDEN');
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(31, Math.max(1, Number(filters.pageSize) || 7));
    const { schedules, totalDays } = await attendanceRepository.findDailyReport({ ...filters, page, pageSize });
    const daysByDate = new Map();
    for (const schedule of schedules) {
        const date = typeof schedule.lesson_date === 'string'
            ? schedule.lesson_date.slice(0, 10)
            : formatIstanbulDateKey(schedule.lesson_date);
        if (!daysByDate.has(date)) {
            daysByDate.set(date, { date, lesson_count: 0, attendance_taken_count: 0, schedules: [] });
        }
        const day = daysByDate.get(date);
        day.lesson_count += 1;
        day.attendance_taken_count += schedule.attendance_taken ? 1 : 0;
        day.schedules.push(schedule);
    }
    return {
        days: [...daysByDate.values()],
        page,
        pageSize,
        totalDays,
        totalPages: Math.ceil(totalDays / pageSize),
    };
}

module.exports = { getScheduleAttendance, saveScheduleAttendance, getMyAttendance, getReport, getDailyReport };
