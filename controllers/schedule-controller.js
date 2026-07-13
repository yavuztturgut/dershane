const pool = require('../db/pool');

async function getSchedules(req, res) {
    try {
        const user = req.user;

        let query = `
              SELECT
                  s.id,
                  s.course_id,
                  co.name AS course_name,
                  s.class_id,
                  cl.name AS class_name,
                  s.teacher_id,
                  u.name AS teacher_name,
                  s.start_time,
                  s.end_time,
                  s.created_at,
                  s.updated_at
              FROM schedules s
              JOIN courses co ON co.id = s.course_id
              JOIN classes cl ON cl.id = s.class_id
              JOIN users u ON u.id = s.teacher_id
          `;

        const params = [];

        if (user.role_name === 'teacher') {
            query += ` WHERE s.teacher_id = $1`;
            params.push(user.id);
        }

        if (user.role_name === 'student') {
            query += ` WHERE s.class_id = $1`;
            params.push(user.class_id);
        }

        query += ` ORDER BY s.start_time ASC`;

        const result = await pool.query(query, params);

        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getScheduleById(req, res) {
    try {
        const {id} = req.params;
        const user = req.user;

        let query = `
        SELECT
        s.id,
        s.course_id,
        co.name AS course_name,
        s.class_id,
        cl.name AS class_name,
        s.teacher_id,
        u.name AS teacher_name,
        s.start_time,
        s.end_time,
        s.created_at,
        s.updated_at
        FROM schedules s
        JOIN courses co ON co.id = s.course_id
        JOIN classes cl ON cl.id = s.class_id
        JOIN users u ON u.id = s.teacher_id
        WHERE s.id = $1`;

        const params = [id];

        if (user.role_name === 'teacher') {
            query += ` AND s.teacher_id = $2`;
            params.push(user.id);
        }

        if (user.role_name === 'student') {
            query += ` AND s.class_id = $2`;
            params.push(user.class_id);
        }
        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function createSchedule(req, res) {
    try {
        const { course_id, class_id, teacher_id, start_time, end_time } = req.body;

        if (!course_id || !class_id || !teacher_id || !start_time || !end_time) {
            return res.status(400).json({
                error: 'course_id, class_id, teacher_id, start_time and end_time are required'
            });
        }

        const teacherCheck = await pool.query(
            `
              SELECT u.id
              FROM users u
              JOIN roles r ON r.id = u.role_id
              WHERE u.id = $1
                AND r.name = 'teacher'
                AND u.is_active = true
              `,
            [teacher_id]
        );

        if (teacherCheck.rows.length === 0) {
            return res.status(400).json({
                error: 'teacher_id must belong to an active teacher'
            });
        }

        const result = await pool.query(
            `
              INSERT INTO schedules (
                  course_id,
                  class_id,
                  teacher_id,
                  start_time,
                  end_time
              )
              VALUES ($1, $2, $3, $4, $5)
              RETURNING
                  id,
                  course_id,
                  class_id,
                  teacher_id,
                  start_time,
                  end_time,
                  created_at,
                  updated_at
              `,
            [course_id, class_id, teacher_id, start_time, end_time]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.log(error);

        if (error.code === '23503') {
            return res.status(400).json({
                error: 'Invalid course_id, class_id or teacher_id'
            });
        }

        if (error.code === '23514') {
            return res.status(400).json({
                error: 'end_time must be greater than start_time'
            });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
}

async function updateSchedule(req, res) {
    try {
        const { id } = req.params;
        const { course_id, class_id, teacher_id, start_time, end_time } = req.body;

        const existingSchedule = await pool.query(
            'SELECT * FROM schedules WHERE id = $1',
            [id]
        );

        if (existingSchedule.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        const finalTeacherId = teacher_id || existingSchedule.rows[0].teacher_id;

        const teacherCheck = await pool.query(
            `
              SELECT u.id
              FROM users u
              JOIN roles r ON r.id = u.role_id
              WHERE u.id = $1
                AND r.name = 'teacher'
                AND u.is_active = true
              `,
            [finalTeacherId]
        );

        if (teacherCheck.rows.length === 0) {
            return res.status(400).json({
                error: 'teacher_id must belong to an active teacher'
            });
        }

        const result = await pool.query(
            `
              UPDATE schedules
              SET
                  course_id = COALESCE($1, course_id),
                  class_id = COALESCE($2, class_id),
                  teacher_id = COALESCE($3, teacher_id),
                  start_time = COALESCE($4, start_time),
                  end_time = COALESCE($5, end_time),
                  updated_at = NOW()
              WHERE id = $6
              RETURNING
                  id,
                  course_id,
                  class_id,
                  teacher_id,
                  start_time,
                  end_time,
                  created_at,
                  updated_at
              `,
            [course_id, class_id, teacher_id, start_time, end_time, id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.log(error);

        if (error.code === '23503') {
            return res.status(400).json({
                error: 'Invalid course_id, class_id or teacher_id'
            });
        }

        if (error.code === '23514') {
            return res.status(400).json({
                error: 'end_time must be greater than start_time'
            });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
}

async function deleteSchedule(req, res) {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
              DELETE FROM schedules
              WHERE id = $1
              RETURNING
                  id,
                  course_id,
                  class_id,
                  teacher_id,
                  start_time,
                  end_time,
                  created_at,
                  updated_at
              `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        res.json({
            message: 'Schedule deleted successfully',
            schedule: result.rows[0]
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    getSchedules,
    getScheduleById,
    createSchedule,
    updateSchedule,
    deleteSchedule
};