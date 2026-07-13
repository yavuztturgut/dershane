const pool = require('../db/pool');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

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

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return res.status(403).json({
                error: 'User is inactive'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                role_id: user.role_id,
                role_name: user.role_name,
                class_id: user.class_id
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                role_id: user.role_id,
                role_name: user.role_name,
                class_id: user.class_id,
                class_name: user.class_name,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
}

async function getProfile(req, res) {
    try {
        const userId = req.user.id;

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
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
}

module.exports = {
    login,
    getProfile
};