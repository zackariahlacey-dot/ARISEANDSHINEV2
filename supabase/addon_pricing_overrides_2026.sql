-- Admin-tunable add-on pricing + duration overrides.
--
-- Hard-coded base values still live in the source (INTERIOR_ADDONS /
-- EXTERIOR_ADDONS / DURATION_EXTENDING_ADDONS etc.) — this table layers an
-- optional override on top so the admin can tweak prices without a deploy
-- and revert any time. When no row exists for (addon_id, size), the source
-- default applies.
--
-- Every change is mirrored into addon_pricing_history (append-only) so the
-- previous price/duration is never lost.

create table if not exists public.addon_pricing_overrides (
  addon_id text not null,
  size text not null,                       -- 'compact' | 'sedan' | 'suv' | 'xl' | 'all' for size-agnostic addons
  price_cents int,                          -- null = use base
  duration_mins int,                        -- null = use base
  reason text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  primary key (addon_id, size)
);

create table if not exists public.addon_pricing_history (
  id uuid primary key default gen_random_uuid(),
  addon_id text not null,
  size text not null,
  prev_price_cents int,
  new_price_cents int,
  prev_duration_mins int,
  new_duration_mins int,
  base_price_cents int,                     -- snapshot of the hard-coded base at the time of change
  base_duration_mins int,
  reason text,
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now()
);

create index if not exists idx_addon_pricing_history_addon on public.addon_pricing_history (addon_id, size, changed_at desc);

-- Lock down RLS — only the service role writes, only admins read.
alter table public.addon_pricing_overrides enable row level security;
alter table public.addon_pricing_history enable row level security;

drop policy if exists "service role full access" on public.addon_pricing_overrides;
create policy "service role full access" on public.addon_pricing_overrides
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service role full access" on public.addon_pricing_history;
create policy "service role full access" on public.addon_pricing_history
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
