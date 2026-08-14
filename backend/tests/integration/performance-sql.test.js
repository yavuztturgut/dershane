const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const attendanceRepository = require('../../src/modules/attendance/attendance.repository');

const connectionString = process.env.TEST_DATABASE_URL;
const indexMigrationPath = path.join(__dirname, '..', '..', 'src', 'database', 'migrations', '20260816_schedule_filter_indexes.sql');

async function isolatedClient(t, prefix) {
    const client = new Client({ connectionString });
    const schema = `${prefix}_${randomUUID().replaceAll('-', '')}`;
    const quotedSchema = `"${schema}"`;
    await client.connect();
    t.after(async () => {
        await client.query(`DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE`);
        await client.end();
    });
    await client.query(`CREATE SCHEMA ${quotedSchema}`);
    await client.query(`SET search_path TO ${quotedSchema}, public`);
    return { client, schema };
}

test('set-based attendance upsert is atomic when the roster contains an invalid student', { skip: !connectionString }, async (t) => {
    const { client } = await isolatedClient(t, 'attendance_bulk');
    await client.query(`
        CREATE TABLE schedule_students (schedule_id INTEGER NOT NULL, student_id INTEGER NOT NULL, PRIMARY KEY (schedule_id, student_id));
        CREATE TABLE attendance_records (
            id SERIAL PRIMARY KEY,
            schedule_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            status VARCHAR(16) NOT NULL,
            recorded_by INTEGER NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE (schedule_id, student_id)
        );
        INSERT INTO schedule_students VALUES (10, 1), (10, 2);
    `);

    const invalid = await attendanceRepository.upsertAttendance(10, [
        { student_id: 1, status: 'present' },
        { student_id: 99, status: 'absent' },
    ], 7, client);
    assert.deepEqual(invalid.invalid_student_ids, [99]);
    assert.equal((await client.query('SELECT COUNT(*)::INTEGER AS count FROM attendance_records')).rows[0].count, 0);

    const saved = await attendanceRepository.upsertAttendance(10, [
        { student_id: 1, status: 'present' },
        { student_id: 2, status: 'late' },
    ], 7, client);
    assert.equal(saved.updated_count, 2);
    const rows = await client.query('SELECT student_id, status FROM attendance_records ORDER BY student_id');
    assert.deepEqual(rows.rows, [{ student_id: 1, status: 'present' }, { student_id: 2, status: 'late' }]);
});

test('schedule filter migration creates role and time indexes', { skip: !connectionString }, async (t) => {
    const { client, schema } = await isolatedClient(t, 'schedule_indexes');
    await client.query(`CREATE TABLE schedules (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL
    )`);
    await client.query(fs.readFileSync(indexMigrationPath, 'utf8'));
    const indexes = await client.query(
        `SELECT indexname FROM pg_indexes WHERE schemaname = $1 AND tablename = 'schedules' ORDER BY indexname`,
        [schema]
    );
    assert.deepEqual(indexes.rows.map((row) => row.indexname), [
        'schedules_class_time_idx',
        'schedules_course_time_idx',
        'schedules_pkey',
        'schedules_teacher_time_idx',
    ]);
});
