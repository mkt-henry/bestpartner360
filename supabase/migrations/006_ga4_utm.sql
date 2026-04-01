-- ============================================================
-- GA4 UTM ENTRIES (브랜드별 UTM 추적 항목)
-- ============================================================
create table ga4_utm_entries (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  label text not null,                          -- 표시용 이름: "4월 프로모션 블로그"
  landing_url text,                             -- 랜딩 URL (선택)
  utm_source text not null,                     -- e.g. "naver"
  utm_medium text not null,                     -- e.g. "cpc"
  utm_campaign text,                            -- e.g. "spring_sale"
  utm_term text,
  utm_content text,
  created_at timestamptz default now()
);

alter table ga4_utm_entries enable row level security;
create policy "admin_all" on ga4_utm_entries for all using (is_admin());
create policy "viewer_read" on ga4_utm_entries for select using (brand_id in (select viewer_brand_ids()));
create index on ga4_utm_entries (brand_id);

-- ============================================================
-- GA4 UTM PERFORMANCE (UTM별 일별 성과 데이터)
-- ============================================================
create table ga4_utm_performance (
  id uuid primary key default uuid_generate_v4(),
  utm_entry_id uuid not null references ga4_utm_entries(id) on delete cascade,
  record_date date not null,
  sessions integer not null default 0,
  users integer not null default 0,
  pageviews integer not null default 0,
  bounce_rate numeric(5,2),                     -- 0.00 ~ 100.00
  avg_session_duration numeric(8,2),            -- 초 단위
  conversions integer not null default 0,
  revenue numeric(15,2) not null default 0,
  updated_at timestamptz default now(),
  unique(utm_entry_id, record_date)
);

alter table ga4_utm_performance enable row level security;
create policy "admin_all" on ga4_utm_performance for all using (is_admin());
create policy "viewer_read" on ga4_utm_performance for select using (
  utm_entry_id in (select id from ga4_utm_entries where brand_id in (select viewer_brand_ids()))
);
create index on ga4_utm_performance (utm_entry_id, record_date);
