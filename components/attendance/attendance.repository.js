const pool = require('../../db/pool');

async function findSchedule(id) {
    const result = await pool.query(
        `SELECT s.*, co.name AS course_name, cl.name AS class_name, u.name AS teacher_name
         FROM schedules s
         JOIN courses co ON co.id = s.course_id
         JOIN classes cl ON cl.id = s.class_id
         JOIN users u ON u.id = s.teacher_id
         WHERE s.id = $1`,
        [id]
    );
    return result.rows[0];
}

async function findScheduleAttendance(scheduleId) {
    const result = await pool.query(
        `SELECT u.id AS student_id, u.name AS student_name, u.email,
                ar.status, ar.updated_at
         FROM users u
         JOIN roles r ON r.id = u.role_id AND r.name = 'student'
         LEFT JOIN attendance_records ar ON ar.student_id = u.id AND ar.schedule_id = $1
         WHERE u.class_id = (SELECT class_id FROM schedules WHERE id = $1)
           AND u.is_active = true
         ORDER BY u.name ASC`,
        [scheduleId]
    );
    return result.rows;
}

async function upsertAttendance(scheduleId, records, recordedBy) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const record of records) {
            await client.query(
                `INSERT INTO attendance_records (schedule_id, student_id, status, recorded_by)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (schedule_id, student_id) DO UPDATE
                 SET status = EXCLUDED.status, recorded_by = EXCLUDED.recorded_by, updated_at = NOW()`,
                [scheduleId, record.student_id, record.status, recordedBy]
            );
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function findStudentAttendance(studentId, filters) {
    const params = [studentId];
    const conditions = ['s.class_id = u.class_id', 's.end_time <= NOW()'];
    if (filters.start) { params.push(filters.start); conditions.push(`s.end_time >= $${params.length}`); }
    if (filters.end) { params.push(filters.end); conditions.push(`s.start_time < $${params.length}`); }
    const result = await pool.query(
        `SELECT s.id AS schedule_id, s.start_time, s.end_time, co.name AS course_name,
                cl.name AS class_name, t.name AS teacher_name, ar.status
         FROM users u
         JOIN schedules s ON ${conditions.join(' AND ')}
         JOIN courses co ON co.id = s.course_id
         JOIN classes cl ON cl.id = s.class_id
         JOIN users t ON t.id = s.teacher_id
         LEFT JOIN attendance_records ar ON ar.schedule_id = s.id AND ar.student_id = u.id
         WHERE u.id = $1
         ORDER BY s.start_time DESC`,
        params
    );
    return result.rows;
}

async function findReport(filters) {
    const params = [];
    const conditions = [];
    for (const [column, value] of [['s.class_id', filters.class_id], ['ar.student_id', filters.student_id]]) {
        if (value) { params.push(value); conditions.push(`${column} = $${params.length}`); }
    }
    if (filters.start) { params.push(filters.start); conditions.push(`s.end_time >= $${params.length}`); }
    if (filters.end) { params.push(filters.end); conditions.push(`s.start_time < $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countParams = [...params];
    params.push(filters.pageSize, (filters.page - 1) * filters.pageSize);
    const [result, countResult] = await Promise.all([pool.query(
        `SELECT ar.id, ar.status, ar.updated_at, ar.student_id, st.name AS student_name,
                s.id AS schedule_id, s.start_time, s.end_time, co.name AS course_name, cl.name AS class_name
         FROM attendance_records ar
         JOIN users st ON st.id = ar.student_id
         JOIN schedules s ON s.id = ar.schedule_id
         JOIN courses co ON co.id = s.course_id
         JOIN classes cl ON cl.id = s.class_id
         ${where}
         ORDER BY s.start_time DESC, st.name ASC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
    ), pool.query(
        `SELECT COUNT(*)::INTEGER AS total
         FROM attendance_records ar JOIN schedules s ON s.id = ar.schedule_id ${where}`,
        countParams
    )]);
    return { items: result.rows, total: countResult.rows[0].total };
}

module.exports = {
    findSchedule,
    findScheduleAttendance,
    upsertAttendance,
    findStudentAttendance,
    findReport
};
