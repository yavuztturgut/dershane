-- Existing timestamp values are Istanbul wall-clock lesson times. PostgreSQL
-- converts them to instants while preserving what users see in Istanbul.
-- The guard also makes this safe for a fresh database created from create.sql,
-- where these columns already use timestamptz.
DO $migration$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'schedules'
          AND column_name = 'start_time'
          AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE schedules
            ALTER COLUMN start_time TYPE TIMESTAMPTZ
                USING start_time AT TIME ZONE 'Europe/Istanbul',
            ALTER COLUMN end_time TYPE TIMESTAMPTZ
                USING end_time AT TIME ZONE 'Europe/Istanbul';
    END IF;
END
$migration$;
