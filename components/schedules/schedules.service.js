const schedulesRepository = require('./schedules.repository');
const createHttpError = require('../../utils/create-http-error');

function getLocalDateTime(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
    const date = new Date(value.replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? null : date;
}

async function getSchedules(user) {
    return schedulesRepository.findSchedulesForUser(user);
}

async function getScheduleById(id, user) {
    const schedule = await schedulesRepository.findScheduleByIdForUser(id, user);

    if (!schedule) {
        throw createHttpError('Schedule not found', 404);
    }

    return schedule;
}

async function createSchedule(data) {
    const { course_id, class_id, teacher_id, start_time, end_time } = data;

    if (!course_id || !class_id || !teacher_id || !start_time || !end_time) {
        throw createHttpError('course_id, class_id, teacher_id, start_time and end_time are required', 400, 'SCHEDULE_REQUIRED_FIELDS');
    }

    const startDate = getLocalDateTime(start_time);
    const endDate = getLocalDateTime(end_time);
    if (!startDate || !endDate || endDate <= startDate) {
        throw createHttpError('end_time must be greater than start_time', 400, 'SCHEDULE_END_BEFORE_START');
    }

    const isTeacher = await schedulesRepository.isActiveTeacher(teacher_id);

    if (!isTeacher) {
        throw createHttpError('teacher_id must belong to an active teacher', 400, 'INVALID_TEACHER');
    }

    return schedulesRepository.insertSchedule({
        course_id,
        class_id,
        teacher_id,
        start_time,
        end_time
    });
}

async function updateSchedule(id, data) {
    const existingSchedule = await schedulesRepository.findScheduleById(id);

    if (!existingSchedule) {
        throw createHttpError('Schedule not found', 404);
    }

    const finalTeacherId = data.teacher_id || existingSchedule.teacher_id;
    const isTeacher = await schedulesRepository.isActiveTeacher(finalTeacherId);

    if (!isTeacher) {
        throw createHttpError('teacher_id must belong to an active teacher', 400);
    }

    return schedulesRepository.updateScheduleById(id, data);
}

async function deleteSchedule(id) {
    const schedule = await schedulesRepository.deleteScheduleById(id);

    if (!schedule) {
        throw createHttpError('Schedule not found', 404);
    }

    return schedule;
}

module.exports = {
    getSchedules,
    getScheduleById,
    createSchedule,
    updateSchedule,
    deleteSchedule
};
