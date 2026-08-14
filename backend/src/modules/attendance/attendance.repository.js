const pool = require('../../database/pool');

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

async function findScheduleAttendance(scheduleId, studentId) {
    const params = [scheduleId];
    const studentCondition = studentId ? `AND student.id = $${params.push(studentId)}` : '';
    const result = await pool.query(
        `SELECT student.id AS student_id, student.name AS student_name, student.email,
                ar.status, ar.updated_at
         FROM schedule_students roster
         JOIN users student ON student.id = roster.student_id
         LEFT JOIN attendance_records ar ON ar.student_id = student.id AND ar.schedule_id = roster.schedule_id
         WHERE roster.schedule_id = $1
           ${studentCondition}
         ORDER BY student.name ASC`,
        params
    );
    return result.rows;
}

async function upsertAttendance(scheduleId, records, recordedBy, db = pool) {
    const result = await db.query(
        `WITH input AS (
             SELECT DISTINCT ON (student_id) student_id, status
             FROM ROWS FROM (
                 jsonb_to_recordset($2::jsonb) AS (student_id INTEGER, status VARCHAR(16))
             ) WITH ORDINALITY AS record(student_id, status, position)
             ORDER BY student_id, position DESC
         ),
         invalid AS (
             SELECT input.student_id
             FROM input
             LEFT JOIN schedule_students roster
               ON roster.schedule_id = $1 AND roster.student_id = input.student_id
             WHERE roster.student_id IS NULL
         ),
         upserted AS (
             INSERT INTO attendance_records (schedule_id, student_id, status, recorded_by)
             SELECT $1, input.student_id, input.status, $3
             FROM input
             WHERE NOT EXISTS (SELECT 1 FROM invalid)
             ON CONFLICT (schedule_id, student_id) DO UPDATE
             SET status = EXCLUDED.status,
                 recorded_by = EXCLUDED.recorded_by,
                 updated_at = NOW()
             RETURNING student_id
         )
         SELECT COALESCE((SELECT json_agg(student_id ORDER BY student_id) FROM invalid), '[]'::json) AS invalid_student_ids,
                (SELECT COUNT(*)::INTEGER FROM upserted) AS updated_count`,
        [scheduleId, JSON.stringify(records), recordedBy]
    );

    return result.rows[0];
}

async function findStudentAttendance(studentId, filters) {
    const params = [studentId];
    const conditions = ['roster.student_id = u.id', 'roster.schedule_id = s.id', 's.end_time <= NOW()'];
    if (filters.start_at) {
        params.push(filters.start_at);
        conditions.push(`s.end_time >= $${params.length}`);
    }
    if (filters.end_before) {
        params.push(filters.end_before);
        conditions.push(`s.start_time < $${params.length}`);
    }
    const result = await pool.query(
        `SELECT s.id AS schedule_id, s.start_time, s.end_time, co.name AS course_name,
                cl.name AS class_name, t.name AS teacher_name, ar.status
         FROM users u
         JOIN schedule_students roster ON roster.student_id = u.id
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
    if (filters.start_at) {
        params.push(filters.start_at);
        conditions.push(`s.end_time >= $${params.length}`);
    }
    if (filters.end_before) {
        params.push(filters.end_before);
        conditions.push(`s.start_time < $${params.length}`);
    }
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

function dailyReportFilters(filters, params) {
    const conditions = ['s.start_time <= NOW()'];
    if (filters.class_id) {
        params.push(filters.class_id);
        conditions.push(`s.class_id = $${params.length}`);
    }
    if (filters.student_id) {
        params.push(filters.student_id);
        conditions.push(`EXISTS (
            SELECT 1 FROM schedule_students selected_roster
            WHERE selected_roster.schedule_id = s.id
              AND selected_roster.student_id = $${params.length}
        )`);
    }
    if (filters.start_at) {
        params.push(filters.start_at);
        conditions.push(`s.start_time >= $${params.length}`);
    }
    if (filters.end_before) {
        params.push(filters.end_before);
        conditions.push(`s.start_time < $${params.length}`);
    }
    return conditions;
}

async function findDailyReport(filters) {
    const dateParams = [];
    const dateConditions = dailyReportFilters(filters, dateParams);
    const baseParamCount = dateParams.length;
    dateParams.push(filters.pageSize, (filters.page - 1) * filters.pageSize);
    const datesResult = await pool.query(
        `SELECT (s.start_time AT TIME ZONE 'Europe/Istanbul')::date AS lesson_date
         FROM schedules s
         WHERE ${dateConditions.join(' AND ')}
         GROUP BY (s.start_time AT TIME ZONE 'Europe/Istanbul')::date
         ORDER BY lesson_date DESC
         LIMIT $${baseParamCount + 1} OFFSET $${baseParamCount + 2}`,
        dateParams
    );

    const countParams = [];
    const countConditions = dailyReportFilters(filters, countParams);
    const countResult = await pool.query(
        `SELECT COUNT(DISTINCT (s.start_time AT TIME ZONE 'Europe/Istanbul')::date)::INTEGER AS total
         FROM schedules s
         WHERE ${countConditions.join(' AND ')}`,
        countParams
    );

    if (!datesResult.rows.length) return { schedules: [], totalDays: countResult.rows[0].total };

    const scheduleParams = [];
    const scheduleConditions = dailyReportFilters(filters, scheduleParams);
    scheduleParams.push(datesResult.rows.map((row) => row.lesson_date));
    const selectedStudentParam = filters.student_id ? scheduleParams.indexOf(filters.student_id) + 1 : null;
    const result = await pool.query(
        `SELECT s.id AS schedule_id, (s.start_time AT TIME ZONE 'Europe/Istanbul')::date AS lesson_date, s.start_time, s.end_time,
                co.name AS course_name, cl.name AS class_name, teacher.name AS teacher_name,
                (stats.recorded_count > 0) AS attendance_taken,
                json_build_object(
                    'present', stats.present_count,
                    'absent', stats.absent_count,
                    'late', stats.late_count,
                    'excused', stats.excused_count,
                    'not_recorded', stats.student_count - stats.recorded_count
                ) AS counts
         FROM schedules s
         JOIN courses co ON co.id = s.course_id
         JOIN classes cl ON cl.id = s.class_id
         JOIN users teacher ON teacher.id = s.teacher_id
         LEFT JOIN LATERAL (
             SELECT COUNT(roster.student_id)::INTEGER AS student_count,
                    COUNT(ar.id)::INTEGER AS recorded_count,
                    COUNT(*) FILTER (WHERE ar.status = 'present')::INTEGER AS present_count,
                    COUNT(*) FILTER (WHERE ar.status = 'absent')::INTEGER AS absent_count,
                    COUNT(*) FILTER (WHERE ar.status = 'late')::INTEGER AS late_count,
                    COUNT(*) FILTER (WHERE ar.status = 'excused')::INTEGER AS excused_count
             FROM schedule_students roster
             LEFT JOIN attendance_records ar ON ar.schedule_id = roster.schedule_id AND ar.student_id = roster.student_id
             WHERE roster.schedule_id = s.id
               ${selectedStudentParam ? `AND roster.student_id = $${selectedStudentParam}` : ''}
         ) stats ON true
         WHERE ${scheduleConditions.join(' AND ')}
           AND (s.start_time AT TIME ZONE 'Europe/Istanbul')::date = ANY($${scheduleParams.length}::date[])
         ORDER BY lesson_date DESC, s.start_time ASC`,
        scheduleParams
    );
    return { schedules: result.rows, totalDays: countResult.rows[0].total };
}

module.exports = {
    findSchedule,
    findScheduleAttendance,
    upsertAttendance,
    findStudentAttendance,
    findReport,
    findDailyReport
};
