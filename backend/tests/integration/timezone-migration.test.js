const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');

const connectionString = process.env.TEST_DATABASE_URL;
const migrationPath = path.join(__dirname, '..', '..', 'src', 'database', 'migrations', '20260804_schedule_times_istanbul_timestamptz.sql');
const createPath = path.join(__dirname, '..', '..', 'src', 'database', 'create.sql');

test('fresh schema stores schedule timestamps as timestamptz', () => {
    const createSql = fs.readFileSync(createPath, 'utf8');
    assert.match(createSql, /start_time\s+TIMESTAMPTZ NOT NULL/i);
    assert.match(createSql, /end_time\s+TIMESTAMPTZ NOT NULL/i);
});

test('timezone migration preserves Istanbul wall time, constraints and indexes', { skip: !connectionString }, async (t) => {
    const client = new Client({ connectionString });
    const schema = `timezone_migration_${randomUUID().replaceAll('-', '')}`;
    const quotedSchema = `"${schema}"`;
    await client.connect();
    t.after(async () => {
        await client.query(`DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE`);
        await client.end();
    });

    await client.query(`CREATE SCHEMA ${quotedSchema}`);
    await client.query(`SET search_path TO ${quotedSchema}, public`);
    await client.query(`
        CREATE TABLE schedules (
            id SERIAL PRIMARY KEY,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP NOT NULL,
            CONSTRAINT schedules_time_order CHECK (end_time > start_time)
        );
        CREATE INDEX schedules_time_range_idx ON schedules (start_time, end_time);
        INSERT INTO schedules (start_time, end_time)
        VALUES (TIMESTAMP '2026-08-04 12:00:00', TIMESTAMP '2026-08-04 13:00:00');
    `);

    await client.query(fs.readFileSync(migrationPath, 'utf8'));

    const columns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = 'schedules' AND column_name IN ('start_time', 'end_time')
        ORDER BY column_name
    `, [schema]);
    assert.deepEqual(columns.rows, [
        { column_name: 'end_time', data_type: 'timestamp with time zone' },
        { column_name: 'start_time', data_type: 'timestamp with time zone' }
    ]);

    const converted = await client.query(`
        SELECT start_time, to_char(start_time AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS') AS istanbul_time
        FROM schedules
    `);
    assert.equal(converted.rows[0].start_time.toISOString(), '2026-08-04T09:00:00.000Z');
    assert.equal(converted.rows[0].istanbul_time, '2026-08-04 12:00:00');

    await assert.rejects(
        client.query(`INSERT INTO schedules (start_time, end_time) VALUES ('2026-08-04T10:00:00Z', '2026-08-04T09:00:00Z')`),
        (error) => error.code === '23514'
    );
    const index = await client.query(`
        SELECT indexdef FROM pg_indexes
        WHERE schemaname = $1 AND tablename = 'schedules' AND indexname = 'schedules_time_range_idx'
    `, [schema]);
    assert.equal(index.rowCount, 1);
    assert.match(index.rows[0].indexdef, /start_time, end_time/);
});

test('daily attendance SQL derives dates explicitly in Europe/Istanbul', () => {
    const repositoryPath = path.join(__dirname, '..', '..', 'src', 'modules', 'attendance', 'attendance.repository.js');
    const repository = fs.readFileSync(repositoryPath, 'utf8');
    assert.doesNotMatch(repository, /s\.start_time::date/);
    assert.match(repository, /s\.start_time AT TIME ZONE 'Europe\/Istanbul'/);
});
