-- Drop and recreate the enum with new values (tables are empty now)
ALTER TABLE students ALTER COLUMN current_status DROP DEFAULT;
ALTER TABLE students ALTER COLUMN current_status TYPE text;
ALTER TABLE status_history ALTER COLUMN old_status TYPE text;
ALTER TABLE status_history ALTER COLUMN new_status TYPE text;

DROP TYPE student_status;

CREATE TYPE student_status AS ENUM (
  'not_started',
  'whatsapp_group_added',
  'course_completed',
  'website_completed',
  'selling_initiated',
  'completed'
);

ALTER TABLE students ALTER COLUMN current_status TYPE student_status USING current_status::student_status;
ALTER TABLE students ALTER COLUMN current_status SET DEFAULT 'not_started'::student_status;
ALTER TABLE status_history ALTER COLUMN old_status TYPE student_status USING old_status::student_status;
ALTER TABLE status_history ALTER COLUMN new_status TYPE student_status USING new_status::student_status;