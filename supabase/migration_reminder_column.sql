-- Migration: Add reminder_email_sent_at column to bookings
-- Run this in the Supabase SQL Editor before deploying the reminder cron.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_email_sent_at TIMESTAMPTZ;
