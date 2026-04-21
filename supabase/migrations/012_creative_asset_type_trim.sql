-- ============================================================
-- 012: Narrow creatives.asset_type to {image, video, other}
-- ============================================================
-- Drops the "banner" option. Existing banner rows are migrated
-- to 'other' so the tightened check constraint accepts them.

update creatives set asset_type = 'other' where asset_type = 'banner';

alter table creatives drop constraint if exists creatives_asset_type_check;

alter table creatives
  add constraint creatives_asset_type_check
  check (asset_type in ('image', 'video', 'other'));
