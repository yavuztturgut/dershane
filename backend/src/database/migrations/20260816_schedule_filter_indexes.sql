CREATE INDEX IF NOT EXISTS schedules_teacher_time_idx
    ON schedules (teacher_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS schedules_class_time_idx
    ON schedules (class_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS schedules_course_time_idx
    ON schedules (course_id, start_time);
