const pool = require('../db/pool');
const bcrypt = require('bcrypt');

async function getUsers(req, res) {
    try{
        const result = await pool.query('SELECT id, role_id, class_id, name, ' +
            'email, is_active, created_at, updated_at FROM users ORDER BY id ASC');
    res.json(result.rows);}
    catch (error){
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function createUser(req, res) {
    try{
        const { role_id, class_id, name, email, password } = req.body;
        if (!role_id || !name || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (role_id, class_id, name, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [role_id, class_id || null, name, email, hashedPassword]
        );
        res.status(201).json({ id: result.rows[0].id });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getUserById(req, res) {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT id, role_id, class_id, name, email, is_active,' +
            ' created_at, updated_at FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const { role_id, class_id, name, email, password, is_active } = req.body;
        const existingUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (existingUser.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        let Password = existingUser.rows[0].password;
        if (password) {
            Password = await bcrypt.hash(password, 10);
        }
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
                role_id,
                class_id === undefined ? existingUser.rows[0].class_id : class_id,
                name,
                email,
                Password,
                is_active,
                id
            ]
        );
        res.json(result.rows[0]);
        } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }

    }
    async function deleteUser(req, res) {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id,role_id,class_id,' +
            'name,email,is_active,created_at,updated_at', [id]);
        if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
    }
        res.json({ message: 'User deleted successfully', user: result.rows[0] });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }

    }

module.exports = {
    getUsers,
    createUser,
    getUserById,
    updateUser,
    deleteUser
}