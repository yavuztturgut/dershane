const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const rosterRepository = require('../../src/modules/schedule-roster/schedule-roster.repository');

const connectionString = process.env.TEST_DATABASE_URL;
const migrationPath = path.join(__dirname, '..', '..', 'src', 'database', 'migrations', '20260807_schedule_students_snapshot.sql');
const createPath = path.join(__dirname, '..', '..', 'src', 'database', 'create.sql');

test('fresh schema contains the frozen schedule roster table', () => {
    const createSql = fs.readFileSync(createPath, 'utf8');
    assert.match(createSql, /CREATE TABLE schedule_students/i);
    assert.match(createSql, /PRIMARY KEY \(schedule_id, student_id\)/i);
    assert.match(createSql, /student_id INTEGER NOT NULL REFERENCES users\(id\) ON DELETE RESTRICT/i);
});

test('roster migration backfills current students and recorded former students', { skip: !connectionString }, async (t) => {
    const client = new Client({ connectionString });
    const schema = `schedule_roster_${randomUUID().replaceAll('-', '')}`;
    const quotedSchema = `"${schema}"`;
    await client.connect();
    t.after(async () => {
        await client.query(`DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE`);
        await client.end();
    });

    await client.query(`CREATE SCHEMA ${quotedSchema}`);
    await client.query(`SET search_path TO ${quotedSchema}, public`);
    await client.query(`
        CREATE TABLE roles (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
        CREATE TABLE classes (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            role_id INTEGER NOT NULL REFERENCES roles(id),
            class_id INTEGER REFERENCES classes(id),
            is_active BOOLEAN NOT NULL,
            name TEXT NOT NULL
        );
        CREATE TABLE schedules (
            id INTEGER PRIMARY KEY,
            class_id INTEGER NOT NULL REFERENCES classes(id),
            start_time TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE attendance_records (
            id INTEGER PRIMARY KEY,
            schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
            student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
        );
        INSERT INTO roles VALUES (1, 'student');
        INSERT INTO classes VALUES (1, 'A'), (2, 'B');
        INSERT INTO users VALUES
            (1, 1, 1, true, 'Current student'),
            (2, 1, 2, false, 'Recorded former student'),
            (3, 1, 2, true, 'Unrelated student');
        INSERT INTO schedules VALUES
            (10, 1, NOW() - INTERVAL '1 day'),
            (11, 1, NOW() + INTERVAL '1 day');
        INSERT INTO attendance_records VALUES (100, 10, 2);
    `);

    await client.query(fs.readFileSync(migrationPath, 'utf8'));
    const roster = await client.query('SELECT student_id FROM schedule_students WHERE schedule_id = 10 ORDER BY student_id');
    assert.deepEqual(roster.rows.map((row) => row.student_id), [1, 2]);

    await client.query("INSERT INTO users VALUES (4, 1, 1, true, 'New student')");
    await rosterRepository.syncStudentFutureSchedules(client, 4, { roleName: 'student', classId: 1, isActive: true });
    const futureRoster = await client.query('SELECT student_id FROM schedule_students WHERE schedule_id = 11 ORDER BY student_id');
    assert.deepEqual(futureRoster.rows.map((row) => row.student_id), [1, 4]);

    await client.query('UPDATE users SET class_id = 2, is_active = false WHERE id = 1');
    await rosterRepository.syncStudentFutureSchedules(client, 1, { roleName: 'student', classId: 2, isActive: false });
    const stableRoster = await client.query('SELECT student_id FROM schedule_students WHERE schedule_id = 10 ORDER BY student_id');
    assert.deepEqual(stableRoster.rows.map((row) => row.student_id), [1, 2]);
    const updatedFutureRoster = await client.query('SELECT student_id FROM schedule_students WHERE schedule_id = 11 ORDER BY student_id');
    assert.deepEqual(updatedFutureRoster.rows.map((row) => row.student_id), [4]);
    await assert.rejects(
        client.query('DELETE FROM users WHERE id = 1'),
        (error) => error.constraint === 'schedule_students_student_id_fkey'
    );
});
