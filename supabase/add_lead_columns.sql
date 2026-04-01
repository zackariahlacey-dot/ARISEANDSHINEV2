-- ============================================================
-- Lead Capture: Add direct columns to bookings table
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================
-- These columns store a snapshot of what the customer submitted
-- at booking time, independent of the profiles/vehicles joins.
-- Bookings from accounts will still be linked via user_id for
-- points and history — the direct columns are the source of
-- truth for displaying lead info in the admin.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS customer_name   TEXT,
  ADD COLUMN IF NOT EXISTS customer_email  TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone  TEXT,
  ADD COLUMN IF NOT EXISTS service_address TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_make    TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_model   TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_year    TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_size    TEXT,
  ADD COLUMN IF NOT EXISTS service_name    TEXT,
  ADD COLUMN IF NOT EXISTS addons_json     JSONB;

-- Tracks when the 24-hour review request email was sent (NULL = not yet sent)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS review_email_sent_at TIMESTAMPTZ;

-- Index for fast admin lookups by email / phone
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings (customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone ON bookings (customer_phone);
