const pool = require('../../db/pool');

async function findAllUsers() {
    const result = await pool.query(
        `
          SELECT
              id,
              role_id,
              class_id,
              name,
              email,
              is_active,
              created_at,
              updated_at
          FROM users
          ORDER BY id ASC
          `
    );

    return result.rows;
}

async function findUserById(id) {
    const result = await pool.query(
        `
          SELECT
              id,
              role_id,
              class_id,
              name,
              email,
              is_active,
              created_at,
              updated_at
          FROM users
          WHERE id = $1
          `,
        [id]
    );

    return result.rows[0];
}

async function findUserWithPasswordById(id) {
    const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
    );

    return result.rows[0];
}

async function insertUser(data) {
    const result = await pool.query(
        `
          INSERT INTO users (
              role_id,
              class_id,
              name,
              email,
              password
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
          `,
        [data.role_id, data.class_id || null, data.name, data.email, data.password]
    );

    return result.rows[0];
}

async function updateUserById(id, data) {
    const result = await pool.query(
        `
          UPDATE users
          SET
              role_id = COALESCE($1, role_id),
              class_id = $2,
              name = COALESCE($3, name),
              email = COALESCE($4, email),
              password = COALESCE($5, password),
              is_active = COALESCE($6, is_active),
              updated_at = NOW()
          WHERE id = $7
          RETURNING
              id,
              role_id,
              class_id,
              name,
              email,
              is_active,
              created_at,
              updated_at
          `,
        [
            data.role_id,
            data.class_id,
            data.name,
            data.email,
            data.password,
            data.is_active,
            id
        ]
    );

    return result.rows[0];
}

async function deleteUserById(id) {
    const result = await pool.query(
        `
          DELETE FROM users
          WHERE id = $1
          RETURNING
              id,
              role_id,
              class_id,
              name,
              email,
              is_active,
              created_at,
              updated_at
          `,
        [id]
    );

    return result.rows[0];
}

module.exports = {
    findAllUsers,
    findUserById,
    findUserWithPasswordById,
    insertUser,
    updateUserById,
    deleteUserById
};
