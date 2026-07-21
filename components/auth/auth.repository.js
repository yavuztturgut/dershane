const pool = require('../../db/pool');

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

module.exports = {
    findUserByEmail,
    findProfileById
};
