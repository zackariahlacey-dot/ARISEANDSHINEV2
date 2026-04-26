-- Add 7-day and 3-day reminder tracking columns to bookings table.
-- reminder_email_sent_at (day-before) already exists from a prior migration.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_7day_sent_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_3day_sent_at TIMESTAMPTZ;
