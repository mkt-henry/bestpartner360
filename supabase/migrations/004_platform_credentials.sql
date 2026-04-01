-- ============================================================
-- PLATFORM CREDENTIALS (플랫폼 API 키 저장 - admin 전용)
-- ============================================================
create table platform_credentials (
  id uuid primary key default uuid_generate_v4(),
  platform text not null unique check (platform in ('meta', 'naver')),
  credentials jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table platform_credentials enable row level security;

create policy "admin_all" on platform_credentials for all using (is_admin());
