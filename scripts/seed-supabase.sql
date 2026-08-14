-- One-off deterministic performance/demo seed for the Dershane database.
-- Run the whole file once in the Supabase SQL Editor.
-- Password for every generated user: 12345678

BEGIN;

SET LOCAL TIME ZONE 'Europe/Istanbul';
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '10min';

-- Supabase SQL Editor can reuse a connection after a failed query. Clean only
-- session-local helper tables left by an earlier failed attempt.
DROP TABLE IF EXISTS
    pg_temp.seed_summary,
    pg_temp.seed_integrity,
    pg_temp.seed_attendance_plan,
    pg_temp.seed_schedules,
    pg_temp.seed_schedule_plan,
    pg_temp.seed_schedule_base,
    pg_temp.seed_curriculum,
    pg_temp.seed_teacher_capacity,
    pg_temp.seed_teachers,
    pg_temp.seed_users,
    pg_temp.seed_people,
    pg_temp.seed_teacher_plan,
    pg_temp.seed_selected_names,
    pg_temp.seed_last_names,
    pg_temp.seed_first_names,
    pg_temp.seed_courses,
    pg_temp.seed_classes,
    pg_temp.seed_before_counts,
    pg_temp.seed_required_courses,
    pg_temp.seed_desired_classes;

DO $preflight$
DECLARE
    required_table TEXT;
BEGIN
    IF NOT pg_try_advisory_xact_lock(hashtext('dershane:seed:perf-2026-01')) THEN
        RAISE EXCEPTION 'Another perf-2026-01 seed is already running';
    END IF;

    FOREACH required_table IN ARRAY ARRAY[
        'roles', 'classes', 'users', 'courses', 'schedules',
        'schedule_students', 'attendance_records'
    ] LOOP
        IF to_regclass(required_table) IS NULL THEN
            RAISE EXCEPTION 'Required table % does not exist in the current schema', required_table;
        END IF;
    END LOOP;

    IF EXISTS (
        SELECT 1
        FROM users
        WHERE email LIKE '%.perf-2026-01.%@example.test'
    ) THEN
        RAISE EXCEPTION 'Seed run perf-2026-01 already exists; no data was written';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM roles
        WHERE name IN ('admin', 'teacher', 'student')
    ) <> 3 THEN
        RAISE EXCEPTION 'The admin, teacher and student roles must exist before seeding';
    END IF;
END
$preflight$;

CREATE TEMP TABLE seed_desired_classes (
    field_name TEXT NOT NULL,
    branch_number INTEGER NOT NULL,
    student_count INTEGER NOT NULL,
    class_name TEXT PRIMARY KEY
);

INSERT INTO seed_desired_classes (field_name, branch_number, student_count, class_name)
VALUES
    ('Sayısal', 1, 50, 'Sayısal-1'),
    ('Sayısal', 2, 50, 'Sayısal-2'),
    ('Sayısal', 3, 50, 'Sayısal-3'),
    ('Sayısal', 4, 50, 'Sayısal-4'),
    ('Eşit Ağırlık', 1, 38, 'Eşit Ağırlık-1'),
    ('Eşit Ağırlık', 2, 37, 'Eşit Ağırlık-2'),
    ('Eşit Ağırlık', 3, 38, 'Eşit Ağırlık-3'),
    ('Eşit Ağırlık', 4, 37, 'Eşit Ağırlık-4'),
    ('Sözel', 1, 25, 'Sözel-1'),
    ('Sözel', 2, 25, 'Sözel-2'),
    ('Sözel', 3, 25, 'Sözel-3'),
    ('Sözel', 4, 25, 'Sözel-4'),
    ('Dil', 1, 13, 'Dil-1'),
    ('Dil', 2, 12, 'Dil-2'),
    ('Dil', 3, 13, 'Dil-3'),
    ('Dil', 4, 12, 'Dil-4');

DO $class_preflight$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM classes existing_class
        JOIN seed_desired_classes desired
          ON LOWER(BTRIM(existing_class.name)) = LOWER(BTRIM(desired.class_name))
    ) THEN
        RAISE EXCEPTION 'At least one target class already exists; no data was written';
    END IF;
END
$class_preflight$;

CREATE TEMP TABLE seed_required_courses (
    course_name TEXT PRIMARY KEY,
    must_already_exist BOOLEAN NOT NULL
);

INSERT INTO seed_required_courses (course_name, must_already_exist)
VALUES
    ('Türkçe', TRUE),
    ('Matematik', TRUE),
    ('Fizik', TRUE),
    ('Kimya', TRUE),
    ('Biyoloji', TRUE),
    ('Tarih', TRUE),
    ('Coğrafya', TRUE),
    ('Edebiyat', TRUE),
    ('Geometri', TRUE),
    ('İngilizce', FALSE);

DO $course_preflight$
DECLARE
    missing_courses TEXT;
BEGIN
    SELECT STRING_AGG(required.course_name, ', ' ORDER BY required.course_name)
    INTO missing_courses
    FROM seed_required_courses required
    WHERE required.must_already_exist
      AND NOT EXISTS (
          SELECT 1
          FROM courses existing_course
          WHERE LOWER(BTRIM(existing_course.name)) = LOWER(BTRIM(required.course_name))
      );

    IF missing_courses IS NOT NULL THEN
        RAISE EXCEPTION 'Required existing courses are missing: %', missing_courses;
    END IF;
END
$course_preflight$;

CREATE TEMP TABLE seed_before_counts AS
SELECT
    (SELECT COUNT(*) FROM classes)::BIGINT AS classes,
    (SELECT COUNT(*) FROM courses)::BIGINT AS courses,
    (SELECT COUNT(*) FROM users)::BIGINT AS users,
    (SELECT COUNT(*) FROM schedules)::BIGINT AS schedules,
    (SELECT COUNT(*) FROM schedule_students)::BIGINT AS roster_rows,
    (SELECT COUNT(*) FROM attendance_records)::BIGINT AS attendance_rows;

INSERT INTO courses (name)
SELECT 'İngilizce'
WHERE NOT EXISTS (
    SELECT 1
    FROM courses
    WHERE LOWER(BTRIM(name)) = LOWER(BTRIM('İngilizce'))
);

INSERT INTO classes (name)
SELECT class_name
FROM seed_desired_classes
ORDER BY
    CASE field_name
        WHEN 'Sayısal' THEN 1
        WHEN 'Eşit Ağırlık' THEN 2
        WHEN 'Sözel' THEN 3
        WHEN 'Dil' THEN 4
    END,
    branch_number;

CREATE TEMP TABLE seed_classes AS
SELECT
    desired.field_name,
    desired.branch_number,
    desired.student_count,
    desired.class_name,
    actual.id AS class_id
FROM seed_desired_classes desired
JOIN classes actual
  ON LOWER(BTRIM(actual.name)) = LOWER(BTRIM(desired.class_name));

CREATE TEMP TABLE seed_courses AS
SELECT required.course_name, actual.id AS course_id
FROM seed_required_courses required
JOIN courses actual
  ON LOWER(BTRIM(actual.name)) = LOWER(BTRIM(required.course_name));

CREATE TEMP TABLE seed_first_names (
    name_order INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL UNIQUE
);

INSERT INTO seed_first_names (name_order, first_name)
VALUES
    (1, 'Ahmet'), (2, 'Mehmet'), (3, 'Mustafa'), (4, 'Ali'),
    (5, 'Hasan'), (6, 'Hüseyin'), (7, 'İbrahim'), (8, 'İsmail'),
    (9, 'Emre'), (10, 'Burak'), (11, 'Mert'), (12, 'Kerem'),
    (13, 'Onur'), (14, 'Oğuz'), (15, 'Kaan'), (16, 'Eren'),
    (17, 'Arda'), (18, 'Berk'), (19, 'Can'), (20, 'Yiğit'),
    (21, 'Ayşe'), (22, 'Fatma'), (23, 'Emine'), (24, 'Hatice'),
    (25, 'Zeynep'), (26, 'Elif'), (27, 'Merve'), (28, 'Esra'),
    (29, 'Seda'), (30, 'Selin'), (31, 'Ceren'), (32, 'Derya'),
    (33, 'Buse'), (34, 'Gizem'), (35, 'Ece'), (36, 'İrem'),
    (37, 'Melis'), (38, 'Deniz'), (39, 'Özge'), (40, 'Gökçe');

CREATE TEMP TABLE seed_last_names (
    name_order INTEGER PRIMARY KEY,
    last_name TEXT NOT NULL UNIQUE
);

INSERT INTO seed_last_names (name_order, last_name)
VALUES
    (1, 'Yılmaz'), (2, 'Kaya'), (3, 'Demir'), (4, 'Şahin'),
    (5, 'Çelik'), (6, 'Yıldız'), (7, 'Yıldırım'), (8, 'Öztürk'),
    (9, 'Aydın'), (10, 'Özdemir'), (11, 'Arslan'), (12, 'Doğan'),
    (13, 'Kılıç'), (14, 'Aslan'), (15, 'Çetin'), (16, 'Kara'),
    (17, 'Koç'), (18, 'Kurt'), (19, 'Özkan'), (20, 'Şimşek'),
    (21, 'Polat'), (22, 'Korkmaz'), (23, 'Aktaş'), (24, 'Güneş'),
    (25, 'Bozkurt'), (26, 'Bulut'), (27, 'Keskin'), (28, 'Tekin'),
    (29, 'Erdoğan'), (30, 'Taş'), (31, 'Kaplan'), (32, 'Erdem'),
    (33, 'Karaca'), (34, 'Avcı'), (35, 'Acar'), (36, 'Sarı');

CREATE TEMP TABLE seed_selected_names AS
WITH available_names AS (
    SELECT
        first_names.first_name || ' ' || last_names.last_name AS full_name,
        MD5(
            'perf-2026-01'
            || ':' || first_names.name_order
            || ':' || last_names.name_order
        ) AS deterministic_order
    FROM seed_first_names first_names
    CROSS JOIN seed_last_names last_names
    WHERE NOT EXISTS (
        SELECT 1
        FROM users existing_user
        WHERE LOWER(BTRIM(existing_user.name)) = LOWER(
            BTRIM(first_names.first_name || ' ' || last_names.last_name)
        )
    )
), numbered_names AS (
    SELECT
        ROW_NUMBER() OVER (ORDER BY deterministic_order, full_name)::INTEGER AS person_number,
        full_name
    FROM available_names
)
SELECT person_number, full_name
FROM numbered_names
WHERE person_number <= 525;

DO $name_preflight$
BEGIN
    IF (SELECT COUNT(*) FROM seed_selected_names) <> 525 THEN
        RAISE EXCEPTION 'The Turkish name pool cannot provide 525 unique names against the current users table';
    END IF;

    IF (SELECT COUNT(*) FROM seed_selected_names) <>
       (SELECT COUNT(DISTINCT LOWER(BTRIM(full_name))) FROM seed_selected_names) THEN
        RAISE EXCEPTION 'Generated user names are not unique';
    END IF;
END
$name_preflight$;

CREATE TEMP TABLE seed_teacher_plan (
    teacher_number INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL
);

INSERT INTO seed_teacher_plan (teacher_number, course_name)
SELECT teacher_number,
       CASE
           WHEN teacher_number BETWEEN 1 AND 4 THEN 'Matematik'
           WHEN teacher_number BETWEEN 5 AND 7 THEN 'Türkçe'
           WHEN teacher_number BETWEEN 8 AND 10 THEN 'İngilizce'
           WHEN teacher_number BETWEEN 11 AND 13 THEN 'Edebiyat'
           WHEN teacher_number BETWEEN 14 AND 15 THEN 'Fizik'
           WHEN teacher_number BETWEEN 16 AND 17 THEN 'Kimya'
           WHEN teacher_number BETWEEN 18 AND 19 THEN 'Biyoloji'
           WHEN teacher_number BETWEEN 20 AND 21 THEN 'Tarih'
           WHEN teacher_number BETWEEN 22 AND 23 THEN 'Coğrafya'
           WHEN teacher_number BETWEEN 24 AND 25 THEN 'Geometri'
       END
FROM GENERATE_SERIES(1, 25) AS teacher_number;

CREATE TEMP TABLE seed_people AS
WITH people AS (
    SELECT
        selected.person_number,
        selected.full_name,
        CASE WHEN selected.person_number <= 25 THEN 'teacher' ELSE 'student' END AS role_name,
        CASE WHEN selected.person_number <= 25
            THEN selected.person_number
            ELSE selected.person_number - 25
        END AS role_number
    FROM seed_selected_names selected
), student_fields AS (
    SELECT
        people.*,
        CASE
            WHEN role_number <= 200 THEN 'Sayısal'
            WHEN role_number <= 350 THEN 'Eşit Ağırlık'
            WHEN role_number <= 450 THEN 'Sözel'
            ELSE 'Dil'
        END AS field_name,
        CASE
            WHEN role_number <= 200 THEN role_number
            WHEN role_number <= 350 THEN role_number - 200
            WHEN role_number <= 450 THEN role_number - 350
            ELSE role_number - 450
        END AS field_student_number,
        CASE
            WHEN role_number <= 200 THEN 200
            WHEN role_number <= 350 THEN 150
            WHEN role_number <= 450 THEN 100
            ELSE 50
        END AS field_student_total
    FROM people
)
SELECT
    people.person_number,
    people.full_name,
    people.role_name,
    people.role_number,
    FORMAT(
        '%s.%s.%s@example.test',
        CASE people.role_name WHEN 'teacher' THEN 'ogretmen' ELSE 'ogrenci' END,
        'perf-2026-01',
        LPAD(people.role_number::TEXT, 4, '0')
    ) AS email,
    CASE WHEN people.role_name = 'student'
        THEN people.field_name || '-' ||
             (FLOOR((people.field_student_number - 1) * 4.0 / people.field_student_total) + 1)::INTEGER
    END AS class_name,
    teacher_plan.course_name AS specialty_course,
    CURRENT_TIMESTAMP
        - MAKE_INTERVAL(days => MOD(people.person_number * 37, 365)) AS created_at
FROM student_fields people
LEFT JOIN seed_teacher_plan teacher_plan
  ON teacher_plan.teacher_number = people.role_number
 AND people.role_name = 'teacher';

DO $people_preflight$
BEGIN
    IF (SELECT COUNT(*) FROM seed_people WHERE role_name = 'teacher') <> 25
       OR (SELECT COUNT(*) FROM seed_people WHERE role_name = 'student') <> 500 THEN
        RAISE EXCEPTION 'Generated user role counts are invalid';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM seed_people generated
        JOIN users existing_user
          ON LOWER(BTRIM(existing_user.name)) = LOWER(BTRIM(generated.full_name))
          OR LOWER(BTRIM(existing_user.email)) = LOWER(BTRIM(generated.email))
    ) THEN
        RAISE EXCEPTION 'A generated name or email conflicts with an existing user';
    END IF;

    IF EXISTS (
        SELECT class_name
        FROM seed_people
        WHERE role_name = 'student'
        GROUP BY class_name
        HAVING COUNT(*) <> (
            SELECT desired.student_count
            FROM seed_desired_classes desired
            WHERE desired.class_name = seed_people.class_name
        )
    ) THEN
        RAISE EXCEPTION 'Student class distribution is invalid';
    END IF;
END
$people_preflight$;

INSERT INTO users (
    role_id,
    class_id,
    name,
    email,
    password,
    status,
    token_version,
    created_at,
    updated_at
)
SELECT
    role.id,
    seed_class.class_id,
    person.full_name,
    person.email,
    '$2b$10$/1xoWpGFy1o381QAioWbbeLtNzinuetJJvVeOjXkp8NaY9As4xw5i',
    1,
    0,
    person.created_at,
    person.created_at
FROM seed_people person
JOIN roles role ON role.name = person.role_name
LEFT JOIN seed_classes seed_class ON seed_class.class_name = person.class_name
ORDER BY person.person_number;

CREATE TEMP TABLE seed_users AS
SELECT
    person.person_number,
    person.role_name,
    person.role_number,
    person.full_name,
    person.email,
    person.class_name,
    person.specialty_course,
    actual.id AS user_id,
    actual.class_id
FROM seed_people person
JOIN users actual ON actual.email = person.email;

CREATE TEMP TABLE seed_teachers AS
SELECT
    seed_user.user_id,
    seed_user.full_name,
    seed_user.specialty_course AS course_name,
    ROW_NUMBER() OVER (
        PARTITION BY seed_user.specialty_course
        ORDER BY seed_user.role_number
    )::INTEGER AS specialty_rank
FROM seed_users seed_user
WHERE seed_user.role_name = 'teacher';

CREATE TEMP TABLE seed_teacher_capacity AS
SELECT course_name, COUNT(*)::INTEGER AS teacher_count
FROM seed_teachers
GROUP BY course_name;

CREATE TEMP TABLE seed_curriculum (
    field_name TEXT NOT NULL,
    curriculum_position INTEGER NOT NULL,
    course_name TEXT NOT NULL,
    PRIMARY KEY (field_name, curriculum_position)
);

INSERT INTO seed_curriculum (field_name, curriculum_position, course_name)
SELECT 'Sayısal', position::INTEGER, course_name
FROM UNNEST(ARRAY[
    'Matematik', 'Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji',
    'Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe'
]) WITH ORDINALITY AS curriculum(course_name, position)
UNION ALL
SELECT 'Eşit Ağırlık', position::INTEGER, course_name
FROM UNNEST(ARRAY[
    'Türkçe', 'Matematik', 'Edebiyat', 'Tarih', 'Coğrafya', 'Matematik',
    'Türkçe', 'Edebiyat', 'Tarih', 'Coğrafya', 'Matematik', 'Geometri'
]) WITH ORDINALITY AS curriculum(course_name, position)
UNION ALL
SELECT 'Sözel', position::INTEGER, course_name
FROM UNNEST(ARRAY[
    'Edebiyat', 'Türkçe', 'Tarih', 'Coğrafya', 'Edebiyat', 'Türkçe',
    'Tarih', 'Coğrafya', 'Edebiyat', 'Türkçe', 'Tarih', 'Coğrafya'
]) WITH ORDINALITY AS curriculum(course_name, position)
UNION ALL
SELECT 'Dil', position::INTEGER, course_name
FROM UNNEST(ARRAY[
    'İngilizce', 'İngilizce', 'Türkçe', 'İngilizce', 'Edebiyat', 'İngilizce',
    'Türkçe', 'İngilizce', 'Tarih', 'İngilizce', 'Edebiyat', 'Coğrafya'
]) WITH ORDINALITY AS curriculum(course_name, position);

DO $curriculum_preflight$
BEGIN
    IF EXISTS (
        SELECT field_name
        FROM seed_curriculum
        GROUP BY field_name
        HAVING COUNT(*) <> 12
    ) OR (SELECT COUNT(DISTINCT field_name) FROM seed_curriculum) <> 4 THEN
        RAISE EXCEPTION 'Every field must have exactly 12 weekly curriculum positions';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM seed_curriculum curriculum
        LEFT JOIN seed_courses course ON course.course_name = curriculum.course_name
        WHERE course.course_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Curriculum contains an unavailable course';
    END IF;
END
$curriculum_preflight$;

CREATE TEMP TABLE seed_schedule_base AS
WITH lesson_dates AS (
    SELECT
        lesson_date::DATE AS lesson_date,
        EXTRACT(ISODOW FROM lesson_date)::INTEGER AS weekday_number
    FROM GENERATE_SERIES(
        CURRENT_DATE - 90,
        CURRENT_DATE + 30,
        INTERVAL '1 day'
    ) AS dates(lesson_date)
    WHERE EXTRACT(ISODOW FROM lesson_date) BETWEEN 1 AND 6
), class_lessons AS (
    SELECT
        seed_class.*,
        lesson_dates.lesson_date,
        lesson_dates.weekday_number,
        lesson_number,
        ((lesson_dates.weekday_number - 1) * 2 + lesson_number)::INTEGER AS curriculum_position,
        (
            lesson_dates.lesson_date
            + TIME '08:30'
            + (((seed_class.branch_number - 1) * 2 + lesson_number - 1) * INTERVAL '90 minutes')
        ) AT TIME ZONE 'Europe/Istanbul' AS start_time
    FROM seed_classes seed_class
    CROSS JOIN lesson_dates
    CROSS JOIN GENERATE_SERIES(1, 2) AS lessons(lesson_number)
), lessons_with_courses AS (
    SELECT
        class_lessons.*,
        curriculum.course_name,
        course.course_id
    FROM class_lessons
    JOIN seed_curriculum curriculum
      ON curriculum.field_name = class_lessons.field_name
     AND curriculum.curriculum_position = class_lessons.curriculum_position
    JOIN seed_courses course ON course.course_name = curriculum.course_name
)
SELECT
    lessons_with_courses.*,
    lessons_with_courses.start_time + INTERVAL '80 minutes' AS end_time,
    ROW_NUMBER() OVER (
        PARTITION BY lessons_with_courses.start_time, lessons_with_courses.course_name
        ORDER BY lessons_with_courses.field_name, lessons_with_courses.branch_number
    )::INTEGER AS simultaneous_course_rank
FROM lessons_with_courses;

DO $capacity_preflight$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM seed_schedule_base schedule_base
        LEFT JOIN seed_teacher_capacity capacity
          ON capacity.course_name = schedule_base.course_name
        WHERE capacity.teacher_count IS NULL
           OR schedule_base.simultaneous_course_rank > capacity.teacher_count
    ) THEN
        RAISE EXCEPTION 'Teacher capacity is insufficient for the generated timetable';
    END IF;
END
$capacity_preflight$;

CREATE TEMP TABLE seed_schedule_plan AS
SELECT
    schedule_base.course_id,
    schedule_base.class_id,
    teacher.user_id AS teacher_id,
    schedule_base.start_time,
    schedule_base.end_time,
    schedule_base.course_name,
    schedule_base.class_name
FROM seed_schedule_base schedule_base
JOIN seed_teacher_capacity capacity
  ON capacity.course_name = schedule_base.course_name
JOIN seed_teachers teacher
  ON teacher.course_name = schedule_base.course_name
 AND teacher.specialty_rank = 1 + MOD(
     MOD(
         ('x' || SUBSTRING(MD5(
             'perf-2026-01'
             || ':teacher:' || schedule_base.course_name || ':' || schedule_base.start_time
         ), 1, 8))::BIT(32)::BIGINT,
         capacity.teacher_count
     ) + schedule_base.simultaneous_course_rank - 1,
     capacity.teacher_count
 );

DO $schedule_preflight$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM seed_schedule_plan first_lesson
        JOIN seed_schedule_plan second_lesson
          ON first_lesson.ctid < second_lesson.ctid
         AND (
             first_lesson.class_id = second_lesson.class_id
             OR first_lesson.teacher_id = second_lesson.teacher_id
         )
         AND first_lesson.start_time < second_lesson.end_time
         AND first_lesson.end_time > second_lesson.start_time
    ) THEN
        RAISE EXCEPTION 'Generated timetable contains a class or teacher conflict';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM seed_schedule_plan generated
        JOIN schedules existing
          ON (generated.class_id = existing.class_id OR generated.teacher_id = existing.teacher_id)
         AND generated.start_time < existing.end_time
         AND generated.end_time > existing.start_time
    ) THEN
        RAISE EXCEPTION 'Generated timetable conflicts with an existing lesson';
    END IF;
END
$schedule_preflight$;

INSERT INTO schedules (
    course_id,
    class_id,
    teacher_id,
    start_time,
    end_time,
    created_at,
    updated_at
)
SELECT
    course_id,
    class_id,
    teacher_id,
    start_time,
    end_time,
    LEAST(CURRENT_TIMESTAMP, start_time - INTERVAL '14 days'),
    LEAST(CURRENT_TIMESTAMP, start_time - INTERVAL '14 days')
FROM seed_schedule_plan
ORDER BY start_time, class_id;

CREATE TEMP TABLE seed_schedules AS
SELECT
    actual.id AS schedule_id,
    actual.course_id,
    actual.class_id,
    actual.teacher_id,
    actual.start_time,
    actual.end_time
FROM schedules actual
JOIN seed_schedule_plan planned
  ON planned.course_id = actual.course_id
 AND planned.class_id = actual.class_id
 AND planned.teacher_id = actual.teacher_id
 AND planned.start_time = actual.start_time
 AND planned.end_time = actual.end_time;

DO $schedule_count_check$
BEGIN
    IF (SELECT COUNT(*) FROM seed_schedules) <> (SELECT COUNT(*) FROM seed_schedule_plan) THEN
        RAISE EXCEPTION 'Not every planned schedule could be identified after insertion';
    END IF;
END
$schedule_count_check$;

INSERT INTO schedule_students (schedule_id, student_id, created_at)
SELECT
    schedule.schedule_id,
    student.user_id,
    LEAST(CURRENT_TIMESTAMP, schedule.start_time - INTERVAL '14 days')
FROM seed_schedules schedule
JOIN seed_users student
  ON student.role_name = 'student'
 AND student.class_id = schedule.class_id
ORDER BY schedule.schedule_id, student.user_id;

CREATE TEMP TABLE seed_attendance_plan AS
WITH eligible_schedules AS (
    SELECT
        schedule.*,
        MOD(
            ('x' || SUBSTRING(MD5(
                'perf-2026-01:schedule:' || schedule.schedule_id
            ), 1, 8))::BIT(32)::BIGINT,
            100
        )::INTEGER AS completion_bucket
    FROM seed_schedules schedule
    WHERE schedule.end_time <= CURRENT_TIMESTAMP
), eligible_roster AS (
    SELECT
        schedule.schedule_id,
        schedule.teacher_id,
        schedule.end_time,
        schedule.completion_bucket,
        roster.student_id,
        MOD(
            ('x' || SUBSTRING(MD5(
                'perf-2026-01:roster:' || schedule.schedule_id || ':' || roster.student_id
            ), 1, 8))::BIT(32)::BIGINT,
            100
        )::INTEGER AS student_bucket
    FROM eligible_schedules schedule
    JOIN schedule_students roster ON roster.schedule_id = schedule.schedule_id
), included_roster AS (
    SELECT *
    FROM eligible_roster
    WHERE completion_bucket < 80
       OR (completion_bucket BETWEEN 80 AND 89 AND student_bucket < 50)
)
SELECT
    roster.schedule_id,
    roster.student_id,
    CASE
        WHEN roster.student_bucket < 85 THEN 'present'
        WHEN roster.student_bucket < 92 THEN 'late'
        WHEN roster.student_bucket < 97 THEN 'absent'
        ELSE 'excused'
    END::VARCHAR(16) AS status,
    roster.teacher_id AS recorded_by,
    LEAST(CURRENT_TIMESTAMP, roster.end_time + INTERVAL '30 minutes') AS recorded_at
FROM included_roster roster;

INSERT INTO attendance_records (
    schedule_id,
    student_id,
    status,
    recorded_by,
    created_at,
    updated_at
)
SELECT
    schedule_id,
    student_id,
    status,
    recorded_by,
    recorded_at,
    recorded_at
FROM seed_attendance_plan
ORDER BY schedule_id, student_id;

CREATE TEMP TABLE seed_integrity AS
SELECT
    (
        SELECT COUNT(*) - COUNT(DISTINCT LOWER(BTRIM(full_name)))
        FROM seed_users
    )::BIGINT AS duplicate_seed_names,
    (
        SELECT COUNT(*) - COUNT(DISTINCT LOWER(BTRIM(email)))
        FROM seed_users
    )::BIGINT AS duplicate_seed_emails,
    (
        SELECT COUNT(*)
        FROM seed_schedules first_lesson
        JOIN seed_schedules second_lesson
          ON first_lesson.schedule_id < second_lesson.schedule_id
         AND (
             first_lesson.class_id = second_lesson.class_id
             OR first_lesson.teacher_id = second_lesson.teacher_id
         )
         AND first_lesson.start_time < second_lesson.end_time
         AND first_lesson.end_time > second_lesson.start_time
    )::BIGINT AS schedule_conflicts,
    (
        SELECT COUNT(*)
        FROM schedule_students roster
        JOIN seed_schedules schedule ON schedule.schedule_id = roster.schedule_id
        JOIN users student ON student.id = roster.student_id
        JOIN roles role ON role.id = student.role_id
        WHERE student.class_id <> schedule.class_id
           OR student.status <> 1
           OR role.name <> 'student'
    )::BIGINT AS invalid_roster_rows,
    (
        SELECT COUNT(*)
        FROM attendance_records attendance
        JOIN seed_schedules schedule ON schedule.schedule_id = attendance.schedule_id
        LEFT JOIN schedule_students roster
          ON roster.schedule_id = attendance.schedule_id
         AND roster.student_id = attendance.student_id
        WHERE roster.student_id IS NULL
    )::BIGINT AS attendance_outside_roster,
    (
        SELECT COUNT(*)
        FROM attendance_records attendance
        JOIN seed_schedules schedule ON schedule.schedule_id = attendance.schedule_id
        WHERE schedule.end_time > CURRENT_TIMESTAMP
    )::BIGINT AS future_attendance_rows;

DO $integrity_check$
DECLARE
    checks seed_integrity%ROWTYPE;
BEGIN
    SELECT * INTO checks FROM seed_integrity;

    IF checks.duplicate_seed_names <> 0
       OR checks.duplicate_seed_emails <> 0
       OR checks.schedule_conflicts <> 0
       OR checks.invalid_roster_rows <> 0
       OR checks.attendance_outside_roster <> 0
       OR checks.future_attendance_rows <> 0 THEN
        RAISE EXCEPTION 'Seed integrity verification failed: %', ROW_TO_JSON(checks);
    END IF;
END
$integrity_check$;

CREATE TEMP TABLE seed_summary AS
SELECT
    'perf-2026-01'::TEXT AS run_id,
    ((SELECT COUNT(*) FROM classes) - before_counts.classes)::BIGINT AS classes_inserted,
    ((SELECT COUNT(*) FROM courses) - before_counts.courses)::BIGINT AS courses_inserted,
    (SELECT COUNT(*) FROM seed_users WHERE role_name = 'teacher')::BIGINT AS teachers_inserted,
    (SELECT COUNT(*) FROM seed_users WHERE role_name = 'student')::BIGINT AS students_inserted,
    (SELECT COUNT(*) FROM seed_schedules)::BIGINT AS schedules_inserted,
    ((SELECT COUNT(*) FROM schedule_students) - before_counts.roster_rows)::BIGINT AS roster_rows_inserted,
    ((SELECT COUNT(*) FROM attendance_records) - before_counts.attendance_rows)::BIGINT AS attendance_rows_inserted,
    (SELECT MIN(start_time) FROM seed_schedules) AS earliest_schedule,
    (SELECT MAX(end_time) FROM seed_schedules) AS latest_schedule,
    integrity.duplicate_seed_names,
    integrity.duplicate_seed_emails,
    integrity.schedule_conflicts,
    integrity.invalid_roster_rows,
    integrity.attendance_outside_roster,
    integrity.future_attendance_rows
FROM seed_before_counts before_counts
CROSS JOIN seed_integrity integrity;

COMMIT;

SELECT * FROM seed_summary;
