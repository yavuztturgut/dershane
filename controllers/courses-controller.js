const pool = require('../db/pool');

async function getCourses(req, res) {
    try {
        const result = await pool.query('SELECT id,name,created_at,updated_at FROM courses ORDER BY id ASC');
        res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
}

async function getCourseById(req, res) {
    try{
        const { id } = req.params;
        const result = await pool.query('SELECT id,name,created_at,updated_at FROM courses WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).send('Course not found');
        }
        res.json(result.rows[0]);
    }
    catch(error){
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
}

async function createCourse(req, res) {
    try {
        const { name } = req.body;
        const result = await pool.query('INSERT INTO courses (name) VALUES ($1) RETURNING id,name,created_at,updated_at', [name]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error.message);
        if (error.code === '23505') {
            return res.status(409).send('Course name already exists');
        }
        res.status(500).send('Internal Server Error');
    }
}

async function updateCourse(req, res) {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const result = await pool.query('UPDATE courses SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id,name,created_at,updated_at', [name, id]);
        if (result.rows.length === 0) {
            return res.status(404).send('Course not found');
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error.message);
        if (error.code === '23505') {
            return res.status(409).send('Course name already exists');
        }
        res.status(500).send('Internal Server Error');
    }}

async function deleteCourse(req, res) {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM courses WHERE id = $1 RETURNING id,name,created_at,updated_at', [id]);
        if (result.rows.length === 0) {
            return res.status(404).send('Course not found');
        }
        res.json({
            message: 'Course deleted successfully',
            course: result.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        if (error.code === '23503') {
            return res.status(409).json({
                error: 'Course is used in schedules and cannot be deleted'
            });
        }
        res.status(500).send('Internal Server Error');
    }
}
module.exports = {
    getCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse
};