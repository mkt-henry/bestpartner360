-- ============================================================
-- GA4 PROPERTIES (GA4 속성 ↔ 브랜드 매핑)
-- ============================================================
create table ga4_properties (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  property_id text not null unique,       -- e.g. "123456789"
  property_name text not null,            -- e.g. "GVB-KOREA 웹사이트"
  created_at timestamptz default now()
);

alter table ga4_properties enable row level security;

create policy "admin_all" on ga4_properties for all using (is_admin());
create policy "viewer_read" on ga4_properties for select using (brand_id in (select viewer_brand_ids()));

create index on ga4_properties (brand_id);
