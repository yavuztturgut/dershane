const pool = require('../../infrastructure/database/pool');

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
    const studentCondition = studentId ? `AND u.id = $${params.push(studentId)}` : '';
    const result = await pool.query(
        `SELECT u.id AS student_id, u.name AS student_name, u.email,
                ar.status, ar.updated_at
         FROM users u
         JOIN roles r ON r.id = u.role_id AND r.name = 'student'
         LEFT JOIN attendance_records ar ON ar.student_id = u.id AND ar.schedule_id = $1
         WHERE u.class_id = (SELECT class_id FROM schedules WHERE id = $1)
           AND u.is_active = true
           ${studentCondition}
         ORDER BY u.name ASC`,
        params
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
    if (filters.start) {
        params.push(filters.start);
        conditions.push(`s.end_time >= ($${params.length}::date::timestamp AT TIME ZONE 'Europe/Istanbul')`);
    }
    if (filters.end) {
        params.push(filters.end);
        conditions.push(`s.start_time < (($${params.length}::date + 1)::timestamp AT TIME ZONE 'Europe/Istanbul')`);
    }
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
    if (filters.start) {
        params.push(filters.start);
        conditions.push(`s.end_time >= ($${params.length}::date::timestamp AT TIME ZONE 'Europe/Istanbul')`);
    }
    if (filters.end) {
        params.push(filters.end);
        conditions.push(`s.start_time < (($${params.length}::date + 1)::timestamp AT TIME ZONE 'Europe/Istanbul')`);
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
            SELECT 1 FROM users selected_student
            JOIN roles selected_role ON selected_role.id = selected_student.role_id AND selected_role.name = 'student'
            WHERE selected_student.id = $${params.length}
              AND selected_student.class_id = s.class_id
              AND selected_student.is_active = true
        )`);
    }
    if (filters.start) {
        params.push(filters.start);
        conditions.push(`(s.start_time AT TIME ZONE 'Europe/Istanbul')::date >= $${params.length}::date`);
    }
    if (filters.end) {
        params.push(filters.end);
        conditions.push(`(s.start_time AT TIME ZONE 'Europe/Istanbul')::date <= $${params.length}::date`);
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
             SELECT COUNT(student.id)::INTEGER AS student_count,
                    COUNT(ar.id)::INTEGER AS recorded_count,
                    COUNT(*) FILTER (WHERE ar.status = 'present')::INTEGER AS present_count,
                    COUNT(*) FILTER (WHERE ar.status = 'absent')::INTEGER AS absent_count,
                    COUNT(*) FILTER (WHERE ar.status = 'late')::INTEGER AS late_count,
                    COUNT(*) FILTER (WHERE ar.status = 'excused')::INTEGER AS excused_count
             FROM users student
             JOIN roles student_role ON student_role.id = student.role_id AND student_role.name = 'student'
             LEFT JOIN attendance_records ar ON ar.schedule_id = s.id AND ar.student_id = student.id
             WHERE student.class_id = s.class_id AND student.is_active = true
               ${selectedStudentParam ? `AND student.id = $${selectedStudentParam}` : ''}
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
