const pool = require('../../db/pool');

async function findAllClasses() {
    const result = await pool.query(
        `
          SELECT
              id,
              name,
              created_at,
              updated_at
          FROM classes
          ORDER BY id ASC
          `
    );

    return result.rows;
}

async function findClassById(id) {
    const result = await pool.query(
        `
          SELECT
              id,
              name,
              created_at,
              updated_at
          FROM classes
          WHERE id = $1
          `,
        [id]
    );

    return result.rows[0];
}

async function insertClass(name) {
    const result = await pool.query(
        `
          INSERT INTO classes (name)
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

async function updateClassById(id, name) {
    const result = await pool.query(
        `
          UPDATE classes
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

async function deleteClassById(id) {
    const result = await pool.query(
        `
          DELETE FROM classes
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
    findAllClasses,
    findClassById,
    insertClass,
    updateClassById,
    deleteClassById
};
