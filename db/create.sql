CREATE TABLE roles(
                      id SERIAL PRIMARY KEY,
                      name VARCHAR(50) NOT NULL UNIQUE,
                      created_at TIMESTAMP DEFAULT NOW(),
                      updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE classes(
                        id         SERIAL PRIMARY KEY,
                        name       VARCHAR(50) NOT NULL,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE users(
                      id SERIAL PRIMARY KEY,
                      role_id INTEGER NOT NULL REFERENCES roles(id),
                      class_id INTEGER REFERENCES classes(id),
                      name VARCHAR(100) NOT NULL,
                      email VARCHAR(100) NOT NULL UNIQUE,
                      password VARCHAR(100) NOT NULL,
                      is_active BOOLEAN DEFAULT TRUE,
                      token_version INTEGER NOT NULL DEFAULT 0,
                      created_at TIMESTAMP DEFAULT NOW(),
                      updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE courses(
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE schedules(
                          id SERIAL PRIMARY KEY,
                          course_id INTEGER NOT NULL REFERENCES courses(id),
                          class_id INTEGER NOT NULL REFERENCES classes(id),
                          teacher_id INTEGER NOT NULL REFERENCES users(id),
                          start_time TIMESTAMP NOT NULL,
                          end_time TIMESTAMP NOT NULL,
                          created_at TIMESTAMP DEFAULT NOW(),
                          updated_at TIMESTAMP DEFAULT NOW(),
                          CHECK (end_time > start_time)
);

CREATE UNIQUE INDEX classes_normalized_name_key ON classes (LOWER(BTRIM(name)));
CREATE UNIQUE INDEX courses_normalized_name_key ON courses (LOWER(BTRIM(name)));

CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance_records (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    recorded_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (schedule_id, student_id)
);

CREATE INDEX schedules_time_range_idx ON schedules (start_time, end_time);
