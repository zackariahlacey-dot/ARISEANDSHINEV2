-- Add duration_override column to bookings table.
-- When set, this overrides the auto-computed service duration for conflict detection and display.
-- Value is in minutes. NULL means use the default service duration.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_override INTEGER;
