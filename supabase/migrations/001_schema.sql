-- ============================================================
-- BestPartner360 Schema + RLS
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. BRANDS
-- ============================================================
create table brands (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  created_at timestamptz default now()
);

-- ============================================================
-- 2. USER PROFILES (role 관리)
-- ============================================================
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz default now()
);

-- auth.users에 새 유저 생성 시 자동으로 profile 생성
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'viewer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- 3. USER BRAND ACCESS (viewer ↔ brand 매핑)
-- ============================================================
create table user_brand_access (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  unique(user_id, brand_id)
);

-- ============================================================
-- 4. CAMPAIGNS
-- ============================================================
create table campaigns (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null,
  channel text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  start_date date not null,
  end_date date,
  created_at timestamptz default now()
);

-- ============================================================
-- 5. KPI DEFINITIONS (캠페인별 커스텀 KPI 지표)
-- ============================================================
create table kpi_definitions (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  metric_key text not null,          -- 예: "impressions", "clicks", "cpc", "custom_roas"
  label text not null,               -- 화면에 표시될 이름: "노출", "클릭", "CPC"
  unit text not null default '',     -- 예: "회", "원", "%"
  display_order integer not null default 0,
  is_visible boolean not null default true,
  unique(campaign_id, metric_key)
);

-- ============================================================
-- 6. PERFORMANCE RECORDS (일별 KPI 수치)
-- ============================================================
create table performance_records (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  record_date date not null,
  values jsonb not null default '{}',  -- { "impressions": 12000, "clicks": 340 }
  updated_at timestamptz default now(),
  unique(campaign_id, record_date)
);

-- ============================================================
-- 7. BUDGETS (캠페인 기간별 예산)
-- ============================================================
create table budgets (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  total_budget numeric(15,2) not null,
  created_at timestamptz default now()
);

-- ============================================================
-- 8. SPEND RECORDS (일별 지출)
-- ============================================================
create table spend_records (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  spend_date date not null,
  amount numeric(15,2) not null,
  unique(campaign_id, spend_date)
);

-- ============================================================
-- 9. ACTIVITIES (운영 현황 - 스토리형)
-- ============================================================
create table activities (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  channel text,
  title text not null,
  content text not null,
  activity_date date not null default current_date,
  created_at timestamptz default now()
);

-- ============================================================
-- 10. CALENDAR EVENTS (운영 캘린더)
-- ============================================================
create table calendar_events (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  title text not null,
  channel text,
  asset_type text,
  event_date date not null,
  status text not null default 'draft'
    check (status in ('draft','review_requested','feedback_pending','in_revision','upload_scheduled','completed')),
  description text,
  created_at timestamptz default now()
);

-- ============================================================
-- 11. CREATIVES (소재)
-- ============================================================
create table creatives (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  title text not null,
  channel text,
  asset_type text not null default 'image' check (asset_type in ('image','video','banner','other')),
  status text not null default 'draft'
    check (status in ('draft','review_requested','feedback_pending','in_revision','upload_scheduled','completed')),
  description text,
  scheduled_date date,
  created_at timestamptz default now()
);

create table creative_versions (
  id uuid primary key default uuid_generate_v4(),
  creative_id uuid not null references creatives(id) on delete cascade,
  version_number integer not null default 1,
  file_path text not null,
  file_url text not null,
  uploaded_at timestamptz default now()
);

create table creative_comments (
  id uuid primary key default uuid_generate_v4(),
  creative_id uuid not null references creatives(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

alter table brands enable row level security;
alter table user_profiles enable row level security;
alter table user_brand_access enable row level security;
alter table campaigns enable row level security;
alter table kpi_definitions enable row level security;
alter table performance_records enable row level security;
alter table budgets enable row level security;
alter table spend_records enable row level security;
alter table activities enable row level security;
alter table calendar_events enable row level security;
alter table creatives enable row level security;
alter table creative_versions enable row level security;
alter table creative_comments enable row level security;

-- Helper function: 현재 유저가 admin인지 확인
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from user_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper function: viewer가 접근 가능한 brand_id 목록
create or replace function viewer_brand_ids()
returns setof uuid language sql security definer as $$
  select brand_id from user_brand_access where user_id = auth.uid();
$$;

-- BRANDS
create policy "admin_all" on brands for all using (is_admin());
create policy "viewer_read" on brands for select using (id in (select viewer_brand_ids()));

-- USER PROFILES
create policy "admin_all" on user_profiles for all using (is_admin());
create policy "self_read" on user_profiles for select using (id = auth.uid());

-- USER BRAND ACCESS
create policy "admin_all" on user_brand_access for all using (is_admin());
create policy "viewer_read" on user_brand_access for select using (user_id = auth.uid());

-- CAMPAIGNS
create policy "admin_all" on campaigns for all using (is_admin());
create policy "viewer_read" on campaigns for select using (brand_id in (select viewer_brand_ids()));

-- KPI DEFINITIONS
create policy "admin_all" on kpi_definitions for all using (is_admin());
create policy "viewer_read" on kpi_definitions for select using (
  campaign_id in (select id from campaigns where brand_id in (select viewer_brand_ids()))
);

-- PERFORMANCE RECORDS
create policy "admin_all" on performance_records for all using (is_admin());
create policy "viewer_read" on performance_records for select using (
  campaign_id in (select id from campaigns where brand_id in (select viewer_brand_ids()))
);

-- BUDGETS
create policy "admin_all" on budgets for all using (is_admin());
create policy "viewer_read" on budgets for select using (
  campaign_id in (select id from campaigns where brand_id in (select viewer_brand_ids()))
);

-- SPEND RECORDS
create policy "admin_all" on spend_records for all using (is_admin());
create policy "viewer_read" on spend_records for select using (
  campaign_id in (select id from campaigns where brand_id in (select viewer_brand_ids()))
);

-- ACTIVITIES
create policy "admin_all" on activities for all using (is_admin());
create policy "viewer_read" on activities for select using (brand_id in (select viewer_brand_ids()));

-- CALENDAR EVENTS
create policy "admin_all" on calendar_events for all using (is_admin());
create policy "viewer_read" on calendar_events for select using (brand_id in (select viewer_brand_ids()));

-- CREATIVES
create policy "admin_all" on creatives for all using (is_admin());
create policy "viewer_read" on creatives for select using (brand_id in (select viewer_brand_ids()));

-- CREATIVE VERSIONS
create policy "admin_all" on creative_versions for all using (is_admin());
create policy "viewer_read" on creative_versions for select using (
  creative_id in (select id from creatives where brand_id in (select viewer_brand_ids()))
);

-- CREATIVE COMMENTS
create policy "admin_all" on creative_comments for all using (is_admin());
create policy "viewer_read" on creative_comments for select using (
  creative_id in (select id from creatives where brand_id in (select viewer_brand_ids()))
);
create policy "viewer_insert" on creative_comments for insert with check (
  auth.uid() = user_id and
  creative_id in (select id from creatives where brand_id in (select viewer_brand_ids()))
);

-- ============================================================
-- INDEXES
-- ============================================================
create index on campaigns (brand_id);
create index on performance_records (campaign_id, record_date);
create index on spend_records (campaign_id, spend_date);
create index on activities (brand_id, activity_date desc);
create index on calendar_events (brand_id, event_date);
create index on creatives (brand_id, status);
create index on creative_comments (creative_id, created_at);
