-- ───────────────────────────────────────────────────────────────────────────
-- tenant_integrations
-- One row per (tenant, provider). Tracks per-tenant connection state ONLY.
-- Secrets stay in tenant_credentials (provider slug matches).
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.tenant_integrations (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null,
  provider      text not null,            -- slug; matches catalog + delivery.factory
  category      text not null
                check (category in ('ecommerce','carrier','lead_source')),
  status        text not null default 'connected'
                check (status in ('connected','error','disabled')),
  is_default    boolean not null default false,    -- default carrier for pushing orders
  config        jsonb   not null default '{}'::jsonb, -- NON-secret config only
  last_test_at  timestamptz,
  last_test_ok  boolean,
  last_error    text,
  connected_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tenant_id, provider)
);

create index if not exists idx_tenant_integrations_tenant
  on public.tenant_integrations(tenant_id);

create index if not exists idx_tenant_integrations_tenant_category
  on public.tenant_integrations(tenant_id, category);

-- At most ONE default carrier per tenant
create unique index if not exists uniq_default_carrier_per_tenant
  on public.tenant_integrations(tenant_id)
  where (is_default and category = 'carrier');

-- updated_at trigger (uniquely named to avoid clobbering existing functions)
create or replace function public.ti_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tenant_integrations_updated_at on public.tenant_integrations;
create trigger trg_tenant_integrations_updated_at
  before update on public.tenant_integrations
  for each row execute function public.ti_set_updated_at();

-- ─── RLS — same pattern as tenant_credentials (get_tenant_id()) ───────────────
alter table public.tenant_integrations enable row level security;

drop policy if exists "tenant_integrations: select own" on public.tenant_integrations;
create policy "tenant_integrations: select own"
  on public.tenant_integrations for select
  using (tenant_id = get_tenant_id());

drop policy if exists "tenant_integrations: insert own" on public.tenant_integrations;
create policy "tenant_integrations: insert own"
  on public.tenant_integrations for insert
  with check (tenant_id = get_tenant_id());

drop policy if exists "tenant_integrations: update own" on public.tenant_integrations;
create policy "tenant_integrations: update own"
  on public.tenant_integrations for update
  using (tenant_id = get_tenant_id());

drop policy if exists "tenant_integrations: delete own" on public.tenant_integrations;
create policy "tenant_integrations: delete own"
  on public.tenant_integrations for delete
  using (tenant_id = get_tenant_id());
