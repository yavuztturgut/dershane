const test = require('node:test');
const assert = require('node:assert/strict');
const repository = require('./schedules.repository');
const service = require('./schedules.service');

test('createSchedule accepts adjacent non-conflicting lessons', async () => {
    repository.isActiveTeacher = async () => true;
    repository.findConflict = async () => null;
    repository.insertSchedule = async (data) => ({ id: 1, ...data });
    repository.findScheduleByIdForUser = async (id) => ({ id, course_name: 'Math' });
    const result = await service.createSchedule({ course_id: 1, class_id: 2, teacher_id: 3, start_time: '2026-08-03 09:00:00', end_time: '2026-08-03 10:00:00' });
    assert.equal(result.id, 1);
});

test('timezone-less schedule values are interpreted as Istanbul wall time', async () => {
    let inserted;
    repository.isActiveTeacher = async () => true;
    repository.findConflict = async () => null;
    repository.insertSchedule = async (data) => { inserted = data; return { id: 1, ...data }; };
    repository.findScheduleByIdForUser = async (id) => ({ id });

    await service.createSchedule({
        course_id: 1, class_id: 2, teacher_id: 3,
        start_time: '2026-08-04 12:00:00', end_time: '2026-08-04 13:00:00'
    });

    assert.equal(inserted.start_time.toISOString(), '2026-08-04T09:00:00.000Z');
    assert.equal(inserted.end_time.toISOString(), '2026-08-04T10:00:00.000Z');
});

test('offset schedule values remain the same absolute instants', async () => {
    let conflictingData;
    repository.isActiveTeacher = async () => true;
    repository.findConflict = async (data) => { conflictingData = data; return null; };
    repository.insertSchedule = async (data) => ({ id: 1, ...data });
    repository.findScheduleByIdForUser = async (id) => ({ id });

    await service.createSchedule({
        course_id: 1, class_id: 2, teacher_id: 3,
        start_time: '2026-08-04T12:00:00+03:00', end_time: '2026-08-04T13:00:00+03:00'
    });

    assert.equal(conflictingData.start_time.toISOString(), '2026-08-04T09:00:00.000Z');
    assert.equal(conflictingData.end_time.toISOString(), '2026-08-04T10:00:00.000Z');
});

test('schedule time parsing rejects malformed and impossible values', async () => {
    await assert.rejects(
        service.createSchedule({ course_id: 1, class_id: 2, teacher_id: 3, start_time: '2026-02-30 12:00:00', end_time: '2026-03-01 13:00:00' }),
        (error) => error.errorCode === 'SCHEDULE_END_BEFORE_START'
    );
    await assert.rejects(
        service.createSchedule({ course_id: 1, class_id: 2, teacher_id: 3, start_time: '2026-08-04 12:00 trailing', end_time: '2026-08-04 13:00:00' }),
        (error) => error.errorCode === 'SCHEDULE_END_BEFORE_START'
    );
});

test('timezone-less schedule values preserve milliseconds', async () => {
    let inserted;
    repository.isActiveTeacher = async () => true;
    repository.findConflict = async () => null;
    repository.insertSchedule = async (data) => { inserted = data; return { id: 1, ...data }; };
    repository.findScheduleByIdForUser = async (id) => ({ id });
    await service.createSchedule({ course_id: 1, class_id: 2, teacher_id: 3, start_time: '2026-08-04 12:00:00.123', end_time: '2026-08-04 13:00:00.456' });
    assert.equal(inserted.start_time.toISOString(), '2026-08-04T09:00:00.123Z');
    assert.equal(inserted.end_time.toISOString(), '2026-08-04T10:00:00.456Z');
});

test('schedule range filters are normalized before querying', async () => {
    let receivedFilters;
    repository.findSchedulesForUser = async (_user, filters) => { receivedFilters = filters; return []; };

    await service.getSchedules({ role_name: 'admin' }, {
        start: '2026-08-04 00:00:00', end: '2026-08-05T00:00:00+03:00'
    });

    assert.equal(receivedFilters.start.toISOString(), '2026-08-03T21:00:00.000Z');
    assert.equal(receivedFilters.end.toISOString(), '2026-08-04T21:00:00.000Z');
});

test('createSchedule reports the conflicting lesson', async () => {
    repository.isActiveTeacher = async () => true;
    repository.findConflict = async () => ({ id: 9, course_name: 'Math' });
    await assert.rejects(
        service.createSchedule({ course_id: 1, class_id: 2, teacher_id: 3, start_time: '2026-08-03 09:00:00', end_time: '2026-08-03 10:00:00' }),
        (error) => error.statusCode === 409 && error.errorCode === 'SCHEDULE_CONFLICT' && error.details.id === 9
    );
});

test('updateSchedule validates the final time range', async () => {
    repository.findScheduleById = async () => ({ id: 1, course_id: 1, class_id: 2, teacher_id: 3, start_time: new Date('2026-08-03T09:00:00'), end_time: new Date('2026-08-03T10:00:00') });
    await assert.rejects(
        service.updateSchedule(1, { end_time: '2026-08-03 08:00:00' }),
        (error) => error.errorCode === 'SCHEDULE_END_BEFORE_START'
    );
});
