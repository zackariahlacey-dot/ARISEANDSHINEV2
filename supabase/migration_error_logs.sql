-- ============================================================
-- Error Logs: Site-wide error tracking
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.error_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL DEFAULT 'general',  -- 'booking_attempt' | 'webhook' | 'cron' | 'general'
  source      TEXT,                              -- e.g. 'bookDetailing', 'stripe_webhook'
  message     TEXT NOT NULL,
  details     JSONB,                             -- customer_email, service, etc.
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs (created_at DESC);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
-- Service role (admin client) bypasses RLS — no policy needed for inserts
