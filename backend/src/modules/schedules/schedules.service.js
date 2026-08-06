const schedulesRepository = require('./schedules.repository');
const createHttpError = require('../../utils/create-http-error');
const { parseIstanbulDateTime } = require('../../utils/istanbul-date-time');

function normalizeRequiredTimes(data) {
    const start_time = parseIstanbulDateTime(data.start_time);
    const end_time = parseIstanbulDateTime(data.end_time);
    if (!start_time || !end_time || end_time <= start_time) {
        throw createHttpError('end_time must be greater than start_time', 400, 'SCHEDULE_END_BEFORE_START');
    }
    return { ...data, start_time, end_time };
}

async function getSchedules(user, filters = {}) {
    const normalized = { ...filters };
    for (const key of ['start', 'end']) {
        if (!filters[key]) continue;
        normalized[key] = parseIstanbulDateTime(filters[key]);
        if (!normalized[key]) throw createHttpError(`${key} is invalid`, 400, 'INVALID_DATE_RANGE');
    }
    return schedulesRepository.findSchedulesForUser(user, normalized);
}

async function validateSchedule(data, excludeId) {
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

    const normalized = normalizeRequiredTimes({ course_id, class_id, teacher_id, start_time, end_time });
    await validateSchedule(normalized);

    const created = await schedulesRepository.insertSchedule({
        course_id,
        class_id,
        teacher_id,
        start_time: normalized.start_time,
        end_time: normalized.end_time
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
    const normalized = normalizeRequiredTimes(finalData);
    await validateSchedule(normalized, id);

    await schedulesRepository.updateScheduleById(id, {
        ...data,
        ...(data.start_time !== undefined ? { start_time: normalized.start_time } : {}),
        ...(data.end_time !== undefined ? { end_time: normalized.end_time } : {})
    });
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
