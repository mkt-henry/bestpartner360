-- ============================================================
-- REPORTS (저장된 리포트 정의)
-- ============================================================
create table reports (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  title text not null,
  description text,
  report_type text not null default 'manual',      -- "manual" | "scheduled" | "ai"
  config jsonb not null default '{}'::jsonb,       -- 대상 KPI/기간/차트 설정
  schedule_cron text,                              -- cron 문자열, 없으면 수동
  recipients text[],                               -- 이메일 수신자
  author_id uuid references user_profiles(id),
  last_run_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table reports enable row level security;
create policy "admin_all" on reports for all using (is_admin());
create policy "viewer_read" on reports for select using (brand_id in (select viewer_brand_ids()));
create index on reports (brand_id, created_at desc);

-- ============================================================
-- REPORT RUNS (리포트 생성 이력)
-- ============================================================
create table report_runs (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid not null references reports(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  status text not null default 'pending',          -- "pending" | "running" | "success" | "failed"
  output_url text,                                 -- PDF/CSV 저장 위치
  error_message text,
  started_at timestamptz default now(),
  completed_at timestamptz
);

alter table report_runs enable row level security;
create policy "admin_all" on report_runs for all using (is_admin());
create policy "viewer_read" on report_runs for select using (brand_id in (select viewer_brand_ids()));
create index on report_runs (report_id, started_at desc);
create index on report_runs (brand_id, status, started_at desc);
