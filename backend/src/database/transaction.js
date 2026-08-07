const pool = require('./pool');

async function withTransaction(operation) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await operation(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function lockClasses(client, classIds) {
    const ids = [...new Set(classIds.filter(Boolean).map(Number))].sort((left, right) => left - right);
    if (!ids.length) return;
    await client.query(
        'SELECT id FROM classes WHERE id = ANY($1::INTEGER[]) ORDER BY id FOR UPDATE',
        [ids]
    );
}

module.exports = { lockClasses, withTransaction };
