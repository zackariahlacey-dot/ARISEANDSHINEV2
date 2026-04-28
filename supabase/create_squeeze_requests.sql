-- Squeeze Me In: urgent booking requests from customers who need to be fit in quickly
CREATE TABLE IF NOT EXISTS squeeze_requests (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name           text        NOT NULL,
  phone          text        NOT NULL,
  email          text,
  service_type   text        NOT NULL DEFAULT 'auto',   -- 'auto' | 'boat' | 'rv'
  urgency        text        NOT NULL DEFAULT 'soon',   -- 'today' | 'tomorrow' | 'this_week' | 'soon'
  available_dates text       NOT NULL,                  -- free-text availability description
  notes          text,
  status         text        NOT NULL DEFAULT 'pending', -- 'pending' | 'contacted' | 'booked' | 'dismissed'
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Index for admin queries (newest first, filter by status)
CREATE INDEX IF NOT EXISTS idx_squeeze_requests_created ON squeeze_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_squeeze_requests_status  ON squeeze_requests(status);
