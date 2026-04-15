-- ============================================================
-- ALERT RULES (브랜드별 알림 규칙 정의)
-- ============================================================
create table alert_rules (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null,                              -- 표시용 이름: "Budget pacing > 130%"
  metric text not null,                            -- e.g. "spend_pacing", "cac", "roas", "ctr", "funnel_dropoff"
  operator text not null,                          -- ">", "<", ">=", "<=", "=="
  threshold numeric(15,4) not null,                -- 임계값
  scope jsonb default '{}'::jsonb,                 -- 추가 조건: {"channel":"meta","window_hours":24}
  notify_channel text not null default 'dashboard', -- "email" | "slack" | "dashboard" | "email,slack"
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table alert_rules enable row level security;
create policy "admin_all" on alert_rules for all using (is_admin());
create policy "viewer_read" on alert_rules for select using (brand_id in (select viewer_brand_ids()));
create index on alert_rules (brand_id, is_active);

-- ============================================================
-- ALERT EVENTS (발생한 알림 인스턴스)
-- ============================================================
create table alert_events (
  id uuid primary key default uuid_generate_v4(),
  rule_id uuid not null references alert_rules(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  severity text not null default 'warn',           -- "crit" | "warn" | "info"
  title text not null,
  message text,
  payload jsonb default '{}'::jsonb,               -- 발동 시점 메트릭 스냅샷
  status text not null default 'open',             -- "open" | "ack" | "resolved"
  fired_at timestamptz default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

alter table alert_events enable row level security;
create policy "admin_all" on alert_events for all using (is_admin());
create policy "viewer_read" on alert_events for select using (brand_id in (select viewer_brand_ids()));
create index on alert_events (brand_id, status, fired_at desc);
create index on alert_events (rule_id, fired_at desc);
