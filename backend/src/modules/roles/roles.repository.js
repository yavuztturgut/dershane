const pool = require('../../infrastructure/database/pool');

async function findAllRoles() {
    const result = await pool.query(
        `
          SELECT
              id,
              name,
              created_at,
              updated_at
          FROM roles
          ORDER BY id ASC
          `
    );

    return result.rows;
}

async function findRoleById(id) {
    const result = await pool.query(
        `
          SELECT
              id,
              name,
              created_at,
              updated_at
          FROM roles
          WHERE id = $1
          `,
        [id]
    );

    return result.rows[0];
}

async function insertRole(name) {
    const result = await pool.query(
        `
          INSERT INTO roles (name)
          VALUES ($1)
          RETURNING
              id,
              name,
              created_at,
              updated_at
          `,
        [name]
    );

    return result.rows[0];
}

async function updateRoleById(id, name) {
    const result = await pool.query(
        `
          UPDATE roles
          SET
              name = $1,
              updated_at = NOW()
          WHERE id = $2
          RETURNING
              id,
              name,
              created_at,
              updated_at
          `,
        [name, id]
    );

    return result.rows[0];
}

async function deleteRoleById(id) {
    const result = await pool.query(
        `
          DELETE FROM roles
          WHERE id = $1
          RETURNING
              id,
              name,
              created_at,
              updated_at
          `,
        [id]
    );

    return result.rows[0];
}

module.exports = {
    findAllRoles,
    findRoleById,
    insertRole,
    updateRoleById,
    deleteRoleById
};
