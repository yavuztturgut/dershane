const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../../database/pool');
const repository = require('./users.repository');
const rosterRepository = require('../schedule-roster/schedule-roster.repository');

function useClient(handler) {
    const queries = [];
    const client = {
        async query(sql, params) {
            const normalized = String(sql).trim();
            queries.push({ sql: normalized, params });
            if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalized)) return { rows: [], rowCount: 0 };
            return handler(normalized, params);
        },
        release() {}
    };
    pool.connect = async () => client;
    return queries;
}

test('an active admin cannot archive their own account', async () => {
    const queries = useClient(async (sql) => {
        if (sql.includes('FOR UPDATE OF u')) {
            return { rows: [{ id: 4, role_id: 1, role_name: 'admin', password: 'hash', class_id: null, status: 1 }], rowCount: 1 };
        }
        throw new Error(`Unexpected query: ${sql}`);
    });

    await assert.rejects(
        repository.archiveUser(4, 4),
        (error) => error.errorCode === 'SELF_ACCOUNT_STATUS_CHANGE' && error.statusCode === 409
    );
    assert.ok(queries.some(({ sql }) => sql === 'ROLLBACK'));
});

test('a teacher with a future schedule cannot be archived', async () => {
    const queries = useClient(async (sql) => {
        if (sql.includes('JOIN roles role') && sql.includes('FOR UPDATE OF u')) {
            return { rows: [{ id: 8, role_id: 2, role_name: 'teacher', password: 'hash', class_id: null, status: 1 }], rowCount: 1 };
        }
        if (sql.startsWith('SELECT 1 FROM schedules')) return { rows: [{ '?column?': 1 }], rowCount: 1 };
        throw new Error(`Unexpected query: ${sql}`);
    });

    await assert.rejects(
        repository.archiveUser(8, 1),
        (error) => error.errorCode === 'TEACHER_HAS_FUTURE_SCHEDULES' && error.statusCode === 409
    );
    assert.ok(queries.some(({ sql }) => sql === 'ROLLBACK'));
});

test('the last active admin cannot be archived by another actor', async () => {
    useClient(async (sql) => {
        if (sql.includes('JOIN roles role') && sql.includes('FOR UPDATE OF u')) {
            return { rows: [{ id: 9, role_id: 1, role_name: 'admin', password: 'hash', class_id: null, status: 1 }], rowCount: 1 };
        }
        if (sql.includes("r.name = 'admin'")) return { rows: [{ id: 9 }], rowCount: 1 };
        throw new Error(`Unexpected query: ${sql}`);
    });

    await assert.rejects(
        repository.archiveUser(9, 1),
        (error) => error.errorCode === 'LAST_ACTIVE_ADMIN' && error.statusCode === 409
    );
});

test('bulk preview counts missing, unchanged and self accounts as skipped', async () => {
    pool.query = async (sql) => {
        if (sql.includes('WHERE u.id = ANY')) return {
            rows: [
                { id: 1, role_id: 1, role_name: 'admin', class_id: null, status: 1 },
                { id: 2, role_id: 2, role_name: 'teacher', class_id: null, status: 1 },
                { id: 3, role_id: 3, role_name: 'student', class_id: 4, status: 0 },
            ],
            rowCount: 3,
        };
        throw new Error(`Unexpected query: ${sql}`);
    };

    const result = await repository.previewBulkUsers([1, 2, 3, 99], { type: 'deactivate' }, 1);

    assert.deepEqual(result, { selected: 4, eligible: 1, skipped: 3 });
});

test('bulk class assignment updates eligible students and their future roster atomically', async () => {
    let rosterUpdate;
    rosterRepository.syncStudentsFutureSchedules = async (client, students) => { rosterUpdate = { client, students }; };
    const queries = useClient(async (sql) => {
        if (sql === 'SELECT id FROM classes WHERE id = $1') return { rows: [{ id: 5 }], rowCount: 1 };
        if (sql.includes('WHERE u.id = ANY')) return {
            rows: [
                { id: 7, role_id: 3, role_name: 'student', password: 'hash', class_id: 4, status: 1 },
                { id: 8, role_id: 3, role_name: 'student', password: 'hash', class_id: 4, status: 1 },
            ],
            rowCount: 2,
        };
        if (sql.startsWith('SELECT id FROM classes WHERE id = ANY')) return { rows: [{ id: 4 }, { id: 5 }], rowCount: 2 };
        if (sql.startsWith('UPDATE users')) return { rows: [{ id: 7 }, { id: 8 }], rowCount: 2 };
        throw new Error(`Unexpected query: ${sql}`);
    });

    const result = await repository.applyBulkUsers([7, 8], { type: 'assign_class', class_id: 5 }, 1);

    assert.deepEqual(result, { selected: 2, applied_ids: [7, 8], skipped: 0 });
    assert.deepEqual(rosterUpdate.students, [
        { id: 7, roleName: 'student', classId: 5, isActive: true },
        { id: 8, roleName: 'student', classId: 5, isActive: true },
    ]);
    assert.equal(queries.filter(({ sql }) => sql.startsWith('UPDATE users')).length, 1);
    assert.ok(queries.some(({ sql }) => sql === 'COMMIT'));
});
