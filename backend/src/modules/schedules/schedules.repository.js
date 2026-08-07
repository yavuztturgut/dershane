const pool = require('../../database/pool');
const { lockClasses, withTransaction } = require('../../database/transaction');
const rosterRepository = require('../schedule-roster/schedule-roster.repository');

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

async function findConflict({ teacher_id, class_id, start_time, end_time, excludeId }, db = pool) {
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
    const result = await db.query(query, params);
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

async function findScheduleById(id, db = pool, forUpdate = false) {
    const result = await db.query(
        `SELECT * FROM schedules WHERE id = $1 ${forUpdate ? 'FOR UPDATE' : ''}`,
        [id]
    );

    return result.rows[0];
}

async function isActiveTeacher(userId, db = pool) {
    const result = await db.query(
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

async function insertSchedule(data, db = pool) {
    const result = await db.query(
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

async function updateScheduleById(id, data, db = pool) {
    const result = await db.query(
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

async function deleteScheduleById(id, db = pool) {
    const result = await db.query(
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

async function insertScheduleWithRoster(data) {
    return withTransaction(async (client) => {
        await lockClasses(client, [data.class_id]);
        const schedule = await insertSchedule(data, client);
        await rosterRepository.populateSchedule(client, schedule.id, schedule.class_id);
        return schedule;
    });
}

async function updateScheduleWithRoster(id, data) {
    return withTransaction(async (client) => {
        const existing = await findScheduleById(id, client, true);
        if (!existing) return { schedule: undefined, rosterLocked: false };

        const classChanged = data.class_id !== undefined && Number(data.class_id) !== Number(existing.class_id);
        const startChanged = data.start_time !== undefined
            && new Date(data.start_time).getTime() !== new Date(existing.start_time).getTime();
        if (new Date(existing.start_time).getTime() <= Date.now() && (classChanged || startChanged)) {
            return { schedule: existing, rosterLocked: true };
        }

        const finalClassId = data.class_id ?? existing.class_id;
        await lockClasses(client, [existing.class_id, finalClassId]);
        const schedule = await updateScheduleById(id, data, client);
        if (classChanged || startChanged) {
            await rosterRepository.rebuildSchedule(client, id, finalClassId);
        }
        return { schedule, rosterLocked: false };
    });
}

module.exports = {
    findSchedulesForUser,
    findScheduleByIdForUser,
    findScheduleById,
    isActiveTeacher,
    insertSchedule,
    updateScheduleById,
    deleteScheduleById
    ,findConflict,
    insertScheduleWithRoster,
    updateScheduleWithRoster
};
