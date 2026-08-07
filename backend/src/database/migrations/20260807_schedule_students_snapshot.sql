CREATE TABLE IF NOT EXISTS schedule_students (
    schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (schedule_id, student_id)
);

CREATE INDEX IF NOT EXISTS schedule_students_student_id_idx
    ON schedule_students (student_id, schedule_id);

INSERT INTO schedule_students (schedule_id, student_id)
SELECT schedule_id, student_id
FROM (
    SELECT schedule.id AS schedule_id, student.id AS student_id
    FROM schedules schedule
    JOIN users student ON student.class_id = schedule.class_id AND student.is_active = true
    JOIN roles role ON role.id = student.role_id AND role.name = 'student'

    UNION

    SELECT attendance.schedule_id, attendance.student_id
    FROM attendance_records attendance
) roster
ON CONFLICT (schedule_id, student_id) DO NOTHING;
