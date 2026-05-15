-- ============================================================
-- Universal Hours Update — Vermont Detailing
-- Mon & Thu: 9:30 AM – 6:00 PM
-- Tue, Wed, Fri: 8:00 AM – 6:00 PM
-- Sat & Sun: Closed
-- Run this in the Supabase SQL editor.
-- ============================================================

-- ── 1. Replace null-month defaults with new universal hours ──
DELETE FROM public.operating_hours WHERE month IS NULL;

INSERT INTO public.operating_hours (day_of_week, month, start_time, end_time, is_open)
VALUES
  (1, NULL, '09:30', '18:00', true),  -- Monday    9:30 AM – 6:00 PM
  (2, NULL, '08:00', '18:00', true),  -- Tuesday   8:00 AM – 6:00 PM
  (3, NULL, '08:00', '18:00', true),  -- Wednesday 8:00 AM – 6:00 PM
  (4, NULL, '09:30', '18:00', true),  -- Thursday  9:30 AM – 6:00 PM
  (5, NULL, '08:00', '18:00', true),  -- Friday    8:00 AM – 6:00 PM
  (6, NULL, '08:00', '18:00', false), -- Saturday  closed
  (0, NULL, '08:00', '18:00', false); -- Sunday    closed

-- ── 2. Remove the May override so the new universal hours apply now ──
DELETE FROM public.operating_hours WHERE month = 5;
