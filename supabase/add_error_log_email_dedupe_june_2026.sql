-- ============================================================
-- Error Log: email-alert dedupe column
-- Run this in the Supabase SQL Editor
--
-- Adds emailed_at so logError() can rate-limit owner email alerts to
-- one send per (type+source+message) per 10-minute window. Without
-- this column the dedupe check silently no-ops and Stripe retry storms
-- can carpet-bomb the inbox.
--
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE public.error_logs
  ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ;

-- Compound index for the dedupe query (type + source + message + created_at).
-- Filtered to rows where we've actually emailed so the index stays small.
CREATE INDEX IF NOT EXISTS idx_error_logs_dedupe
  ON public.error_logs (type, source, message, created_at DESC)
  WHERE emailed_at IS NOT NULL;
