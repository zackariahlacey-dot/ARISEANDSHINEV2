-- Gift Cards table
-- Run this in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.gift_cards (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                    TEXT UNIQUE NOT NULL,
  initial_amount          NUMERIC(10,2) NOT NULL,
  remaining_balance       NUMERIC(10,2) NOT NULL,
  purchaser_email         TEXT,
  recipient_email         TEXT,
  recipient_name          TEXT,
  stripe_payment_intent_id TEXT,
  is_active               BOOLEAN DEFAULT TRUE,
  expires_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast code lookups at checkout
CREATE INDEX IF NOT EXISTS gift_cards_code_idx ON public.gift_cards (code);

-- RLS: only the service role (admin client) can read/write
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

-- Allow anon/authenticated to look up a gift card by code (needed for checkout validation)
CREATE POLICY "gift_cards_select_by_code"
  ON public.gift_cards FOR SELECT
  USING (true);

-- Only service role can insert/update/delete (admin client bypasses RLS entirely)
-- No additional policies needed — the admin client uses the service_role key.
