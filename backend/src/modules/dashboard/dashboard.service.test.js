const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSummary } = require('./dashboard.service');

const now = new Date('2026-08-06T09:00:00.000Z');
const totals = { users: 12, courses: 9, classes: 4, schedules: 6 };

function schedule(id, start, end, studentCount, recordedCount) {
    return {
        id,
        start_time: start,
        end_time: end,
        course_name: `Course ${id}`,
        class_name: `Class ${id}`,
        teacher_name: `Teacher ${id}`,
        student_count: studentCount,
        recorded_count: recordedCount,
    };
}

test('dashboard summary classifies today lessons and preserves existing totals', () => {
    const summary = buildSummary({
        totals,
        todaySchedules: [
            schedule(1, '2026-08-06T06:00:00Z', '2026-08-06T07:00:00Z', 10, 10),
            schedule(2, '2026-08-06T08:30:00Z', '2026-08-06T09:30:00Z', 8, 0),
            schedule(3, '2026-08-06T10:00:00Z', '2026-08-06T11:00:00Z', 6, 0),
        ],
        weeklyAttendance: [],
    }, now);

    assert.equal(summary.users, 12);
    assert.deepEqual(summary.today, {
        lessons: 3,
        remaining: 2,
        attendanceCompleted: 1,
        attendanceMissing: 0,
    });
    assert.deepEqual(summary.todaySchedules.map((item) => item.temporal_status), ['ended', 'ongoing', 'upcoming']);
});

test('ended partial attendance is missing and empty classes are not actionable', () => {
    const summary = buildSummary({
        totals,
        todaySchedules: [
            schedule(1, '2026-08-06T06:00:00Z', '2026-08-06T07:00:00Z', 10, 4),
            schedule(2, '2026-08-06T06:00:00Z', '2026-08-06T07:00:00Z', 0, 0),
        ],
        weeklyAttendance: [{ date: '2026-08-06', completed: 1, missing: 1 }],
    }, now);

    assert.equal(summary.today.attendanceMissing, 1);
    assert.equal(summary.todaySchedules[0].attendance_status, 'missing');
    assert.equal(summary.todaySchedules[1].attendance_status, 'no_students');
    assert.deepEqual(summary.weeklyAttendance, [{ date: '2026-08-06', completed: 1, missing: 1 }]);
});
