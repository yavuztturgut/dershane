const test = require('node:test');
const assert = require('node:assert/strict');
const repository = require('./attendance.repository');
const service = require('./attendance.service');

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
    const receivedFilters = [];
    repository.findScheduleAttendance = async (_scheduleId, studentId) => {
        receivedFilters.push(studentId);
        return [{ student_id: 2, student_name: 'Student' }];
    };
    repository.upsertAttendance = async () => undefined;
    const result = await service.saveScheduleAttendance(1, [{ student_id: 2, status: 'excused' }], { id: 1, role_name: 'admin' }, { student_id: '2' });
    assert.equal(result.records[0].student_id, 2);
    assert.deepEqual(receivedFilters, [undefined, 2]);
});

test('admin daily report defaults to seven calendar days and groups lessons without splitting a day', async () => {
    let receivedFilters;
    repository.findDailyReport = async (filters) => {
        receivedFilters = filters;
        return {
            totalDays: 8,
            schedules: [
                { schedule_id: 3, lesson_date: '2026-08-03', attendance_taken: true },
                { schedule_id: 4, lesson_date: '2026-08-03', attendance_taken: false },
                { schedule_id: 2, lesson_date: '2026-08-02', attendance_taken: true },
            ],
        };
    };

    const result = await service.getDailyReport({ role_name: 'admin' }, { page: '1' });

    assert.equal(receivedFilters.pageSize, 7);
    assert.equal(result.days.length, 2);
    assert.deepEqual(result.days[0].schedules.map((item) => item.schedule_id), [3, 4]);
    assert.equal(result.days[0].lesson_count, 2);
    assert.equal(result.days[0].attendance_taken_count, 1);
    assert.equal(result.totalPages, 2);
});

test('schedule attendance passes an admin student filter to the repository', async () => {
    let receivedStudentId;
    repository.findSchedule = async () => ({ id: 9, teacher_id: 7 });
    repository.findScheduleAttendance = async (_scheduleId, studentId) => {
        receivedStudentId = studentId;
        return [{ student_id: studentId }];
    };

    const result = await service.getScheduleAttendance(9, { role_name: 'admin' }, { student_id: '42' });

    assert.equal(receivedStudentId, 42);
    assert.deepEqual(result.records, [{ student_id: 42 }]);
});
