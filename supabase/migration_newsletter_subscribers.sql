-- ============================================================
-- Newsletter Subscribers
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================
-- Stores opt-in emails from footer signup. Used for seasonal
-- promos, detailing tips, and re-engagement campaigns.
--
-- We dedupe on lower(email) — case-insensitive — to avoid the
-- same person showing up twice from autofill quirks.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  email_lower TEXT GENERATED ALWAYS AS (lower(email)) STORED,
  source      TEXT,            -- 'footer', 'exit_intent', 'guides', etc.
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_email_lower
  ON newsletter_subscribers (email_lower);

CREATE INDEX IF NOT EXISTS idx_newsletter_created_at
  ON newsletter_subscribers (created_at DESC);

-- RLS: lock down completely. Only the admin service-role client
-- (which bypasses RLS) writes here. No public read or write.
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
