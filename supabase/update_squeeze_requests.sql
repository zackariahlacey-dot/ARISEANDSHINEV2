-- Add new columns to squeeze_requests for the improved Squeeze Me In form
ALTER TABLE squeeze_requests
  ADD COLUMN IF NOT EXISTS specific_service   text,
  ADD COLUMN IF NOT EXISTS vehicle_info       text,
  ADD COLUMN IF NOT EXISTS service_address    text,
  ADD COLUMN IF NOT EXISTS contact_preference text NOT NULL DEFAULT 'either';
