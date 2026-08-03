const test = require('node:test');
const assert = require('node:assert/strict');
const repository = require('../components/attendance/attendance.repository');
const service = require('../components/attendance/attendance.service');

test('teacher cannot edit another teacher schedule', async () => {
    repository.findSchedule = async () => ({ id: 1, teacher_id: 7, start_time: new Date(), end_time: new Date() });
    await assert.rejects(service.getScheduleAttendance(1, { id: 8, role_name: 'teacher' }), (error) => error.statusCode === 403);
});

test('teacher attendance locks 24 hours after lesson end', async () => {
    repository.findSchedule = async () => ({ id: 1, teacher_id: 7, start_time: new Date(Date.now() - 49 * 60 * 60 * 1000), end_time: new Date(Date.now() - 25 * 60 * 60 * 1000) });
    await assert.rejects(service.saveScheduleAttendance(1, [], { id: 7, role_name: 'teacher' }), (error) => error.errorCode === 'ATTENDANCE_LOCKED');
});

test('admin can save valid attendance after the teacher lock', async () => {
    repository.findSchedule = async () => ({ id: 1, teacher_id: 7, start_time: new Date(Date.now() - 49 * 60 * 60 * 1000), end_time: new Date(Date.now() - 25 * 60 * 60 * 1000) });
    repository.findScheduleAttendance = async () => [{ student_id: 2, student_name: 'Student' }];
    repository.upsertAttendance = async () => undefined;
    const result = await service.saveScheduleAttendance(1, [{ student_id: 2, status: 'excused' }], { id: 1, role_name: 'admin' });
    assert.equal(result.records[0].student_id, 2);
});
