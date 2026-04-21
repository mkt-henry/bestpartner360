-- ============================================================
-- TIKTOK AD ACCOUNTS (TikTok 광고주 ↔ 브랜드 매핑)
-- ============================================================

-- 1. platform_credentials check 제약에 'tiktok' 추가
alter table platform_credentials drop constraint if exists platform_credentials_platform_check;
alter table platform_credentials add constraint platform_credentials_platform_check
  check (platform in ('meta', 'naver', 'ga4', 'tiktok'));

-- 2. 매핑 테이블
create table tiktok_ad_accounts (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  tiktok_advertiser_id text not null unique,     -- e.g. "7201234567890123456"
  tiktok_advertiser_name text not null,          -- e.g. "GVB-KOREA"
  created_at timestamptz default now()
);

alter table tiktok_ad_accounts enable row level security;

create policy "admin_all" on tiktok_ad_accounts for all using (is_admin());
create policy "viewer_read" on tiktok_ad_accounts for select using (brand_id in (select viewer_brand_ids()));

create index on tiktok_ad_accounts (brand_id);
