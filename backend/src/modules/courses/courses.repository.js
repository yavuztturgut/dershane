const pool = require('../../database/pool');

async function findAllCourses() {
    const result = await pool.query(
        'SELECT id, name, created_at, updated_at FROM courses ORDER BY id ASC'
    );

    return result.rows;
}

async function findCourseById(id) {
    const result = await pool.query(
        'SELECT id, name, created_at, updated_at FROM courses WHERE id = $1',
        [id]
    );

    return result.rows[0];
}

async function insertCourse(name) {
    const result = await pool.query(
        'INSERT INTO courses (name) VALUES ($1) RETURNING id, name, created_at, updated_at',
        [name]
    );

    return result.rows[0];
}

async function updateCourseById(id, name) {
    const result = await pool.query(
        'UPDATE courses SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, created_at, updated_at',
        [name, id]
    );

    return result.rows[0];
}

async function deleteCourseById(id) {
    const result = await pool.query(
        'DELETE FROM courses WHERE id = $1 RETURNING id, name, created_at, updated_at',
        [id]
    );

    return result.rows[0];
}

module.exports = {
    findAllCourses,
    findCourseById,
    insertCourse,
    updateCourseById,
    deleteCourseById
};
