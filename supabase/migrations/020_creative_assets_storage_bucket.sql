-- ============================================================
-- 016: creative-assets storage bucket
-- ============================================================
-- Admin calendar uploads creative files to this bucket. Public so
-- getPublicUrl() works for direct downloads from the drawer.
--
-- Policies:
--   admin_all: admins read/write anything in the bucket
--   authenticated_read: any signed-in user can read (bucket is
--     public anyway; this keeps the policy table self-documenting)

insert into storage.buckets (id, name, public)
values ('creative-assets', 'creative-assets', true)
on conflict (id) do nothing;

create policy "creative_assets_admin_all" on storage.objects
  for all
  using (bucket_id = 'creative-assets' and is_admin());

create policy "creative_assets_authenticated_read" on storage.objects
  for select
  using (bucket_id = 'creative-assets' and auth.role() = 'authenticated');
