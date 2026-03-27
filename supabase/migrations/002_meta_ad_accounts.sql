-- ============================================================
-- META AD ACCOUNTS (Meta 광고 계정 ↔ 브랜드 매핑)
-- ============================================================
create table meta_ad_accounts (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  meta_account_id text not null unique,   -- e.g. "act_111359083024459"
  meta_account_name text not null,        -- e.g. "GVB-KOREA"
  created_at timestamptz default now()
);

alter table meta_ad_accounts enable row level security;

create policy "admin_all" on meta_ad_accounts for all using (is_admin());
create policy "viewer_read" on meta_ad_accounts for select using (brand_id in (select viewer_brand_ids()));

create index on meta_ad_accounts (brand_id);
