-- ============================================================
-- Multi-Vehicle Booking Support
-- Run this in the Supabase SQL editor
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS additional_vehicles_json JSONB;

-- Stores an array of additional vehicle objects, e.g.:
-- [
--   {
--     "vehicleSize": "sedan",
--     "vehicleYear": "2022",
--     "vehicleMake": "Honda",
--     "vehicleModel": "Accord",
--     "serviceId": "...",
--     "serviceName": "Exterior Detail",
--     "servicePrice": 120,
--     "vehicleDbId": "...",
--     "selectedAddons": []
--   }
-- ]
