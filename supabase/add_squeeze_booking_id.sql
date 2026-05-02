-- Link a scheduled squeeze request to the booking that was created
ALTER TABLE squeeze_requests
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_squeeze_requests_booking_id ON squeeze_requests(booking_id);
