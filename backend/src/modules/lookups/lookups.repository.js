const pool = require('../../database/pool');

async function findLookups() {
    const result = await pool.query(`
        SELECT
            COALESCE((
                SELECT json_agg(json_build_object('id', r.id, 'name', r.name) ORDER BY r.id)
                FROM roles r
            ), '[]'::json) AS roles,
            COALESCE((
                SELECT json_agg(json_build_object('id', c.id, 'name', c.name) ORDER BY c.id)
                FROM classes c
            ), '[]'::json) AS classes,
            COALESCE((
                SELECT json_agg(json_build_object('id', c.id, 'name', c.name) ORDER BY c.id)
                FROM courses c
            ), '[]'::json) AS courses,
            COALESCE((
                SELECT json_agg(json_build_object('id', u.id, 'name', u.name) ORDER BY u.name, u.id)
                FROM users u
                JOIN roles r ON r.id = u.role_id
                WHERE r.name = 'teacher' AND u.is_active = true
            ), '[]'::json) AS teachers
    `);

    return result.rows[0];
}

module.exports = { findLookups };
