const pool = require('../db/pool');

async function getClasses(req, res) {
    try {
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

        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getClassById(req, res) {
    try {
        const { id } = req.params;

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

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Class not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    getClasses,
    getClassById
};