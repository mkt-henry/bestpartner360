alter table campaigns
  add column if not exists platform text check (platform in ('meta', 'naver')),
  add column if not exists external_campaign_id text,
  add column if not exists source_account_id text,
  add column if not exists last_synced_at timestamptz;

create index if not exists campaigns_brand_platform_idx on campaigns (brand_id, platform);
create unique index if not exists campaigns_platform_external_campaign_id_idx
  on campaigns (platform, external_campaign_id);

create table if not exists sync_runs (
  id uuid primary key default uuid_generate_v4(),
  platform text not null check (platform in ('meta', 'naver')),
  brand_id uuid references brands(id) on delete set null,
  account_ref text,
  status text not null check (status in ('running', 'success', 'partial', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb not null default '{}',
  error_message text
);

alter table sync_runs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sync_runs'
      and policyname = 'admin_all'
  ) then
    create policy "admin_all" on sync_runs for all using (is_admin());
  end if;
end $$;

create index if not exists sync_runs_platform_started_at_idx on sync_runs (platform, started_at desc);
create index if not exists sync_runs_brand_started_at_idx on sync_runs (brand_id, started_at desc);
