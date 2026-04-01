-- ============================================================
-- NAVER AD ACCOUNTS (네이버 광고 계정 ↔ 브랜드 매핑)
-- ============================================================
create table naver_ad_accounts (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  naver_customer_id text not null unique,     -- e.g. "1234567"
  naver_account_name text not null,           -- e.g. "GVB-KOREA"
  created_at timestamptz default now()
);

alter table naver_ad_accounts enable row level security;

create policy "admin_all" on naver_ad_accounts for all using (is_admin());
create policy "viewer_read" on naver_ad_accounts for select using (brand_id in (select viewer_brand_ids()));

create index on naver_ad_accounts (brand_id);
