const pool = require('../../database/pool');

const attendanceStatsSql = `
    SELECT COUNT(roster.student_id)::INTEGER AS student_count,
           COUNT(attendance.id)::INTEGER AS recorded_count
    FROM schedule_students roster
    LEFT JOIN attendance_records attendance
      ON attendance.schedule_id = roster.schedule_id AND attendance.student_id = roster.student_id
    WHERE roster.schedule_id = s.id
`;

async function findTotals() {
    const result = await pool.query(`
        SELECT
            (SELECT COUNT(*)::INTEGER FROM users WHERE status <> -1) AS users,
            (SELECT COUNT(*)::INTEGER FROM courses) AS courses,
            (SELECT COUNT(*)::INTEGER FROM classes) AS classes,
            (SELECT COUNT(*)::INTEGER FROM schedules) AS schedules
    `);
    return result.rows[0];
}

async function findTodaySchedules() {
    const result = await pool.query(`
        WITH bounds AS (
            SELECT ((NOW() AT TIME ZONE 'Europe/Istanbul')::date::timestamp AT TIME ZONE 'Europe/Istanbul') AS day_start,
                   (((NOW() AT TIME ZONE 'Europe/Istanbul')::date + 1)::timestamp AT TIME ZONE 'Europe/Istanbul') AS day_end
        )
        SELECT s.id, s.start_time, s.end_time,
               course.name AS course_name, classroom.name AS class_name, teacher.name AS teacher_name,
               stats.student_count, stats.recorded_count
        FROM schedules s
        JOIN courses course ON course.id = s.course_id
        JOIN classes classroom ON classroom.id = s.class_id
        JOIN users teacher ON teacher.id = s.teacher_id
        CROSS JOIN bounds
        LEFT JOIN LATERAL (${attendanceStatsSql}) stats ON true
        WHERE s.start_time >= bounds.day_start AND s.start_time < bounds.day_end
        ORDER BY s.start_time ASC
    `);
    return result.rows;
}

async function findWeeklyAttendance() {
    const result = await pool.query(`
        WITH bounds AS (
            SELECT ((NOW() AT TIME ZONE 'Europe/Istanbul')::date - 6)::timestamp AT TIME ZONE 'Europe/Istanbul' AS week_start,
                   (((NOW() AT TIME ZONE 'Europe/Istanbul')::date + 1)::timestamp AT TIME ZONE 'Europe/Istanbul') AS week_end
        ),
        days AS (
            SELECT generate_series(
                (NOW() AT TIME ZONE 'Europe/Istanbul')::date - 6,
                (NOW() AT TIME ZONE 'Europe/Istanbul')::date,
                INTERVAL '1 day'
            )::date AS lesson_date
        ),
        bounded_schedules AS (
            SELECT s.*
            FROM schedules s
            CROSS JOIN bounds
            WHERE s.start_time >= bounds.week_start
              AND s.start_time < bounds.week_end
              AND s.end_time <= NOW()
        )
        SELECT days.lesson_date,
               COUNT(s.id) FILTER (
                   WHERE stats.student_count > 0 AND stats.recorded_count = stats.student_count
               )::INTEGER AS completed,
               COUNT(s.id) FILTER (
                   WHERE stats.student_count > 0 AND stats.recorded_count < stats.student_count
               )::INTEGER AS missing
        FROM days
        LEFT JOIN bounded_schedules s
          ON (s.start_time AT TIME ZONE 'Europe/Istanbul')::date = days.lesson_date
        LEFT JOIN LATERAL (${attendanceStatsSql}) stats ON s.id IS NOT NULL
        GROUP BY days.lesson_date
        ORDER BY days.lesson_date ASC
    `);
    return result.rows.map((row) => ({
        date: typeof row.lesson_date === 'string' ? row.lesson_date.slice(0, 10) : row.lesson_date.toISOString().slice(0, 10),
        completed: row.completed,
        missing: row.missing,
    }));
}

async function getDashboardData() {
    const [totals, todaySchedules, weeklyAttendance] = await Promise.all([
        findTotals(),
        findTodaySchedules(),
        findWeeklyAttendance(),
    ]);
    return { totals, todaySchedules, weeklyAttendance };
}

module.exports = { getDashboardData };
