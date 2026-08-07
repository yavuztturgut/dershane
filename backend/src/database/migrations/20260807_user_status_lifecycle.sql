ALTER TABLE users
    ADD COLUMN IF NOT EXISTS status SMALLINT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_active'
    ) THEN
        EXECUTE 'UPDATE users SET status = CASE WHEN is_active THEN 1 ELSE 0 END WHERE status IS NULL';
    ELSE
        UPDATE users SET status = 1 WHERE status IS NULL;
    END IF;
END $$;

ALTER TABLE users
    ALTER COLUMN status SET DEFAULT 1,
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE users
    ADD CONSTRAINT users_status_check CHECK (status IN (-1, 0, 1));

ALTER TABLE users
    DROP COLUMN IF EXISTS is_active;

CREATE INDEX IF NOT EXISTS users_status_idx ON users (status);
