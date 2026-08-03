const test = require('node:test');
const assert = require('node:assert/strict');
const repository = require('../components/schedules/schedules.repository');
const service = require('../components/schedules/schedules.service');

test('createSchedule accepts adjacent non-conflicting lessons', async () => {
    repository.isActiveTeacher = async () => true;
    repository.findConflict = async () => null;
    repository.insertSchedule = async (data) => ({ id: 1, ...data });
    const result = await service.createSchedule({ course_id: 1, class_id: 2, teacher_id: 3, start_time: '2026-08-03 09:00:00', end_time: '2026-08-03 10:00:00' });
    assert.equal(result.id, 1);
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
