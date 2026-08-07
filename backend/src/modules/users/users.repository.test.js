const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../../database/pool');
const repository = require('./users.repository');

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
