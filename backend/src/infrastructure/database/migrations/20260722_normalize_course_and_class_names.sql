BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM classes GROUP BY LOWER(BTRIM(name)) HAVING COUNT(*) > 1)
    OR EXISTS (SELECT 1 FROM courses GROUP BY LOWER(BTRIM(name)) HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Normalized course or class names contain duplicates; resolve them before running this migration.';
  END IF;
END $$;

UPDATE classes SET name = BTRIM(name) WHERE name <> BTRIM(name);
UPDATE courses SET name = BTRIM(name) WHERE name <> BTRIM(name);
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_name_key;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS classes_normalized_name_key ON classes (LOWER(BTRIM(name)));
CREATE UNIQUE INDEX IF NOT EXISTS courses_normalized_name_key ON courses (LOWER(BTRIM(name)));

COMMIT;
