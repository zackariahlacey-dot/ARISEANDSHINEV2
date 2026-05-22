-- Persisted Resend webhook events so we can analyze deliverability, opens,
-- clicks, bounces, and complaints over time. The webhook handler upserts on
-- the svix-id header (which Resend guarantees unique per event) so retries
-- can't double-count.

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  svix_id text unique not null,
  event_type text not null,             -- email.sent, email.delivered, email.opened, email.clicked, email.bounced, email.complained, email.delivery_delayed
  email_id text,                        -- Resend's per-message id
  recipient text,
  subject text,
  payload jsonb not null,               -- full event body for forensic analysis
  occurred_at timestamptz not null,
  received_at timestamptz not null default now()
);

create index if not exists idx_email_events_recipient on public.email_events (recipient);
create index if not exists idx_email_events_event_type on public.email_events (event_type);
create index if not exists idx_email_events_occurred_at on public.email_events (occurred_at desc);
create index if not exists idx_email_events_email_id on public.email_events (email_id);

-- RLS: only the service role writes (webhook handler) and reads from
-- admin queries. Customer-facing surfaces never touch this.
alter table public.email_events enable row level security;

drop policy if exists "service role full access" on public.email_events;
create policy "service role full access" on public.email_events
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
