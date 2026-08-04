const schedulesRepository = require('./schedules.repository');
const createHttpError = require('../../utils/create-http-error');

function getLocalDateTime(value) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
    const date = new Date(value.replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? null : date;
}

async function getSchedules(user, filters) {
    return schedulesRepository.findSchedulesForUser(user, filters);
}

async function validateSchedule(data, excludeId) {
    const startDate = getLocalDateTime(data.start_time);
    const endDate = getLocalDateTime(data.end_time);
    if (!startDate || !endDate || endDate <= startDate) {
        throw createHttpError('end_time must be greater than start_time', 400, 'SCHEDULE_END_BEFORE_START');
    }
    const isTeacher = await schedulesRepository.isActiveTeacher(data.teacher_id);
    if (!isTeacher) throw createHttpError('teacher_id must belong to an active teacher', 400, 'INVALID_TEACHER');
    const conflict = await schedulesRepository.findConflict({ ...data, excludeId });
    if (conflict) {
        throw createHttpError('Schedule conflicts with an existing lesson', 409, 'SCHEDULE_CONFLICT', conflict);
    }
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

    await validateSchedule({ course_id, class_id, teacher_id, start_time, end_time });

    const created = await schedulesRepository.insertSchedule({
        course_id,
        class_id,
        teacher_id,
        start_time,
        end_time
    });
    return schedulesRepository.findScheduleByIdForUser(created.id, { role_name: 'admin' });
}

async function updateSchedule(id, data) {
    const existingSchedule = await schedulesRepository.findScheduleById(id);

    if (!existingSchedule) {
        throw createHttpError('Schedule not found', 404);
    }

    const finalData = {
        course_id: data.course_id || existingSchedule.course_id,
        class_id: data.class_id || existingSchedule.class_id,
        teacher_id: data.teacher_id || existingSchedule.teacher_id,
        start_time: data.start_time || existingSchedule.start_time,
        end_time: data.end_time || existingSchedule.end_time
    };
    await validateSchedule(finalData, id);

    await schedulesRepository.updateScheduleById(id, data);
    return schedulesRepository.findScheduleByIdForUser(id, { role_name: 'admin' });
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
