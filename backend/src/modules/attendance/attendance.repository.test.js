const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../../database/pool');
const repository = require('./attendance.repository');

test('attendance upsert sends all records through one set-based query', async (t) => {
    const originalQuery = pool.query;
    t.after(() => { pool.query = originalQuery; });
    const calls = [];
    pool.query = async (sql, params) => {
        calls.push({ sql: String(sql), params });
        return { rows: [{ invalid_student_ids: [], updated_count: 2 }] };
    };

    const records = [
        { student_id: 2, status: 'present' },
        { student_id: 3, status: 'late' },
    ];
    const result = await repository.upsertAttendance(9, records, 7);

    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /jsonb_to_recordset/);
    assert.match(calls[0].sql, /NOT EXISTS \(SELECT 1 FROM invalid\)/);
    assert.match(calls[0].sql, /ON CONFLICT \(schedule_id, student_id\) DO UPDATE/);
    assert.deepEqual(calls[0].params, [9, JSON.stringify(records), 7]);
    assert.deepEqual(result, { invalid_student_ids: [], updated_count: 2 });
});
