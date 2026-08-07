async function populateSchedule(client, scheduleId, classId) {
    await client.query(
        `INSERT INTO schedule_students (schedule_id, student_id)
         SELECT $1, student.id
         FROM users student
         JOIN roles role ON role.id = student.role_id AND role.name = 'student'
         WHERE student.class_id = $2 AND student.status = 1
         ON CONFLICT (schedule_id, student_id) DO NOTHING`,
        [scheduleId, classId]
    );
}

async function rebuildSchedule(client, scheduleId, classId) {
    await client.query('DELETE FROM schedule_students WHERE schedule_id = $1', [scheduleId]);
    await populateSchedule(client, scheduleId, classId);
}

async function syncStudentFutureSchedules(client, studentId, { roleName, classId, isActive }) {
    await client.query(
        `DELETE FROM schedule_students roster
         USING schedules schedule
         WHERE roster.schedule_id = schedule.id
           AND roster.student_id = $1
           AND schedule.start_time > NOW()`,
        [studentId]
    );

    if (roleName !== 'student' || !classId || !isActive) return;

    await client.query(
        `INSERT INTO schedule_students (schedule_id, student_id)
         SELECT schedule.id, $1
         FROM schedules schedule
         WHERE schedule.class_id = $2 AND schedule.start_time > NOW()
         ON CONFLICT (schedule_id, student_id) DO NOTHING`,
        [studentId, classId]
    );
}

module.exports = { populateSchedule, rebuildSchedule, syncStudentFutureSchedules };
