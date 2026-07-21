const schedulesRepository = require('./schedules.repository');
const createHttpError = require('../../utils/create-http-error');

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
        throw createHttpError('course_id, class_id, teacher_id, start_time and end_time are required', 400);
    }

    const isTeacher = await schedulesRepository.isActiveTeacher(teacher_id);

    if (!isTeacher) {
        throw createHttpError('teacher_id must belong to an active teacher', 400);
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
