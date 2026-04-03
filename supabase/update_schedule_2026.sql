-- ============================================================
-- Schedule Update — Vermont Detailing
-- Run this in the Supabase SQL editor
-- ============================================================

-- ── 1. Default schedule (all months): Mon–Fri 1 PM – 6 PM ──
-- PostgreSQL treats NULL != NULL in UNIQUE constraints, so we
-- DELETE + INSERT for the null-month (default) rows to be safe.

DELETE FROM public.operating_hours WHERE month IS NULL;

INSERT INTO public.operating_hours (day_of_week, month, start_time, end_time, is_open)
VALUES
  (1, NULL, '13:00', '18:00', true),  -- Monday
  (2, NULL, '13:00', '18:00', true),  -- Tuesday
  (3, NULL, '13:00', '18:00', true),  -- Wednesday
  (4, NULL, '13:00', '18:00', true),  -- Thursday
  (5, NULL, '13:00', '18:00', true),  -- Friday
  (6, NULL, '08:00', '18:00', false), -- Saturday — closed
  (0, NULL, '08:00', '18:00', false); -- Sunday   — closed

-- ── 2. May override: Mon–Fri 10 AM – 6 PM (starting May 1) ──
INSERT INTO public.operating_hours (day_of_week, month, start_time, end_time, is_open)
VALUES
  (1, 5, '10:00', '18:00', true),  -- Monday   in May
  (2, 5, '10:00', '18:00', true),  -- Tuesday  in May
  (3, 5, '10:00', '18:00', true),  -- Wednesday in May
  (4, 5, '10:00', '18:00', true),  -- Thursday in May
  (5, 5, '10:00', '18:00', true)   -- Friday   in May
ON CONFLICT (day_of_week, month) DO UPDATE
  SET start_time = EXCLUDED.start_time,
      end_time   = EXCLUDED.end_time,
      is_open    = EXCLUDED.is_open;

-- ── 3. Block off May 7 ──
-- Remove any existing row for May 7 first, then insert cleanly.
DELETE FROM public.blocked_dates WHERE blocked_date = '2026-05-07';
INSERT INTO public.blocked_dates (blocked_date, reason)
VALUES ('2026-05-07', 'Day off');
