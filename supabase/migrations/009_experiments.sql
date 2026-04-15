-- ============================================================
-- EXPERIMENTS (A/B 테스트 정의)
-- ============================================================
create table experiments (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null,                              -- "EXP-204: Creative hook test"
  hypothesis text,                                 -- 가설
  platform text,                                   -- "meta" | "ga4" | "tiktok" | "crm"
  variants jsonb not null default '[]'::jsonb,     -- [{"label":"A","meta_adset_id":"..."}, ...]
  primary_metric text,                             -- "roas" | "ctr" | "conversion_rate"
  start_date date,
  end_date date,
  status text not null default 'planned',          -- "planned" | "running" | "completed" | "stopped"
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table experiments enable row level security;
create policy "admin_all" on experiments for all using (is_admin());
create policy "viewer_read" on experiments for select using (brand_id in (select viewer_brand_ids()));
create index on experiments (brand_id, status, created_at desc);

-- ============================================================
-- EXPERIMENT RESULTS (실험 변형별 결과 스냅샷)
-- ============================================================
create table experiment_results (
  id uuid primary key default uuid_generate_v4(),
  experiment_id uuid not null references experiments(id) on delete cascade,
  variant_label text not null,                     -- "A" | "B" | "control" 등
  impressions integer not null default 0,
  clicks integer not null default 0,
  conversions integer not null default 0,
  revenue numeric(15,2) not null default 0,
  lift_pct numeric(8,2),                           -- vs control, %
  confidence numeric(5,2),                         -- 0.00 ~ 100.00
  is_winner boolean,
  recorded_at timestamptz default now()
);

alter table experiment_results enable row level security;
create policy "admin_all" on experiment_results for all using (is_admin());
create policy "viewer_read" on experiment_results for select using (
  experiment_id in (select id from experiments where brand_id in (select viewer_brand_ids()))
);
create index on experiment_results (experiment_id, recorded_at desc);
