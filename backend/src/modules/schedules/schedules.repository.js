const pool = require('../../infrastructure/database/pool');

function buildScheduleSelect() {
    return `
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
}

async function findSchedulesForUser(user, filters = {}) {
    let query = buildScheduleSelect();
    const params = [];
    const conditions = [];

    if (user.role_name === 'teacher') {
        params.push(user.id);
        conditions.push(`s.teacher_id = $${params.length}`);
    }

    if (user.role_name === 'student') {
        params.push(user.class_id);
        conditions.push(`s.class_id = $${params.length}`);
    }

    if (!['admin', 'teacher', 'student'].includes(user.role_name)) {
        conditions.push('1 = 0');
    }

    if (filters.start) {
        params.push(filters.start);
        conditions.push(`s.end_time > $${params.length}`);
    }
    if (filters.end) {
        params.push(filters.end);
        conditions.push(`s.start_time < $${params.length}`);
    }

    if (user.role_name === 'admin') {
        for (const [column, value] of [['course_id', filters.course_id], ['class_id', filters.class_id], ['teacher_id', filters.teacher_id]]) {
            if (value) {
                params.push(value);
                conditions.push(`s.${column} = $${params.length}`);
            }
        }
    }

    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;

    query += ' ORDER BY s.start_time ASC';

    const result = await pool.query(query, params);
    return result.rows;
}

async function findConflict({ teacher_id, class_id, start_time, end_time, excludeId }) {
    const params = [teacher_id, class_id, start_time, end_time];
    let query = `${buildScheduleSelect()}
        WHERE (s.teacher_id = $1 OR s.class_id = $2)
          AND s.start_time < $4
          AND s.end_time > $3`;
    if (excludeId) {
        params.push(excludeId);
        query += ' AND s.id <> $5';
    }
    query += ' ORDER BY s.start_time ASC LIMIT 1';
    const result = await pool.query(query, params);
    return result.rows[0];
}

async function findScheduleByIdForUser(id, user) {
    let query = `${buildScheduleSelect()} WHERE s.id = $1`;
    const params = [id];

    if (user.role_name === 'teacher') {
        query += ' AND s.teacher_id = $2';
        params.push(user.id);
    }

    if (user.role_name === 'student') {
        query += ' AND s.class_id = $2';
        params.push(user.class_id);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
}

async function findScheduleById(id) {
    const result = await pool.query(
        'SELECT * FROM schedules WHERE id = $1',
        [id]
    );

    return result.rows[0];
}

async function isActiveTeacher(userId) {
    const result = await pool.query(
        `
          SELECT u.id
          FROM users u
          JOIN roles r ON r.id = u.role_id
          WHERE u.id = $1
            AND r.name = 'teacher'
            AND u.is_active = true
          `,
        [userId]
    );

    return result.rows.length > 0;
}

async function insertSchedule(data) {
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
        [data.course_id, data.class_id, data.teacher_id, data.start_time, data.end_time]
    );

    return result.rows[0];
}

async function updateScheduleById(id, data) {
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
        [data.course_id, data.class_id, data.teacher_id, data.start_time, data.end_time, id]
    );

    return result.rows[0];
}

async function deleteScheduleById(id) {
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

    return result.rows[0];
}

module.exports = {
    findSchedulesForUser,
    findScheduleByIdForUser,
    findScheduleById,
    isActiveTeacher,
    insertSchedule,
    updateScheduleById,
    deleteScheduleById
    ,findConflict
};
