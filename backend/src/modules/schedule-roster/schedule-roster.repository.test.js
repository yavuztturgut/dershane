const test = require('node:test');
const assert = require('node:assert/strict');
const repository = require('./schedule-roster.repository');

test('bulk roster synchronization uses two set-based queries', async () => {
    const calls = [];
    const client = {
        async query(sql, params) {
            calls.push({ sql: String(sql), params });
            return { rows: [], rowCount: 0 };
        },
    };
    const students = [
        { id: 7, roleName: 'student', classId: 5, isActive: true },
        { id: 8, roleName: 'student', classId: 5, isActive: false },
    ];

    await repository.syncStudentsFutureSchedules(client, students);

    assert.equal(calls.length, 2);
    assert.match(calls[0].sql, /student_id = ANY/);
    assert.deepEqual(calls[0].params, [[7, 8]]);
    assert.match(calls[1].sql, /jsonb_to_recordset/);
    assert.match(calls[1].sql, /INSERT INTO schedule_students/);
});
