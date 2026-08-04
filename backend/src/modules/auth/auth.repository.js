const pool = require('../../infrastructure/database/pool');

async function findUserByEmail(email) {
    const result = await pool.query(
        `
          SELECT
              u.id,
              u.role_id,
              r.name AS role_name,
              u.class_id,
              c.name AS class_name,
              u.name,
              u.email,
              u.password,
              u.is_active
              ,u.token_version
          FROM users u
          JOIN roles r ON r.id = u.role_id
          LEFT JOIN classes c ON c.id = u.class_id
          WHERE u.email = $1
          `,
        [email]
    );

    return result.rows[0];
}

async function findProfileById(id) {
    const result = await pool.query(
        `
          SELECT
              u.id,
              u.role_id,
              r.name AS role_name,
              u.class_id,
              c.name AS class_name,
              u.name,
              u.email,
              u.is_active,
              u.created_at,
              u.updated_at
          FROM users u
          JOIN roles r ON r.id = u.role_id
          LEFT JOIN classes c ON c.id = u.class_id
          WHERE u.id = $1
          `,
        [id]
    );

    return result.rows[0];
}

async function findAuthStateById(id) {
    const result = await pool.query(
        `SELECT u.id, u.role_id, r.name AS role_name, u.class_id, u.is_active, u.token_version
         FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
        [id]
    );
    return result.rows[0];
}

async function updateProfile(id, data) {
    const result = await pool.query(
        `UPDATE users SET name = $1, email = $2, updated_at = NOW() WHERE id = $3
         RETURNING id, role_id, class_id, name, email, is_active, created_at, updated_at`,
        [data.name, data.email, id]
    );
    return result.rows[0];
}

async function findPasswordById(id) {
    const result = await pool.query('SELECT id, password FROM users WHERE id = $1', [id]);
    return result.rows[0];
}

async function updatePassword(id, password) {
    await pool.query(
        'UPDATE users SET password = $1, token_version = token_version + 1, updated_at = NOW() WHERE id = $2',
        [password, id]
    );
}

async function createPasswordResetToken(userId, tokenHash, expiresAt) {
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [userId]);
    await pool.query(
        'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [userId, tokenHash, expiresAt]
    );
}

async function findValidPasswordResetToken(tokenHash) {
    const result = await pool.query(
        `SELECT prt.id, prt.user_id
         FROM password_reset_tokens prt
         JOIN users u ON u.id = prt.user_id
         WHERE prt.token_hash = $1 AND prt.used_at IS NULL AND prt.expires_at > NOW() AND u.is_active = true`,
        [tokenHash]
    );
    return result.rows[0];
}

async function consumePasswordResetToken(tokenId, userId, password) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const used = await client.query(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1 AND used_at IS NULL RETURNING id',
            [tokenId]
        );
        if (!used.rowCount) throw new Error('Reset token already used');
        await client.query(
            'UPDATE users SET password = $1, token_version = token_version + 1, updated_at = NOW() WHERE id = $2',
            [password, userId]
        );
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    findUserByEmail,
    findProfileById,
    findAuthStateById,
    updateProfile,
    findPasswordById,
    updatePassword,
    createPasswordResetToken,
    findValidPasswordResetToken,
    consumePasswordResetToken
};
