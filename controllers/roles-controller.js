const pool = require('../db/pool');

async function getRoles(req, res) {
    try {
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

        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getRoleById(req, res) {
    try {
        const { id } = req.params;

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

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function createRole(req, res) {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Role name is required' });
        }

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

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.log(error);

        if (error.code === '23505') {
            return res.status(409).json({ error: 'Role already exists' });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
}

async function updateRole(req, res) {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Role name is required' });
        }

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

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.log(error);

        if (error.code === '23505') {
            return res.status(409).json({ error: 'Role already exists' });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
}

async function deleteRole(req, res) {
    try {
        const { id } = req.params;

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

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }

        res.json({
            message: 'Role deleted successfully',
            role: result.rows[0]
        });
    } catch (error) {
        console.log(error);

        if (error.code === '23503') {
            return res.status(409).json({
                error: 'Role is used by users and cannot be deleted'
            });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    getRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
};
