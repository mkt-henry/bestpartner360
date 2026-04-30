-- ============================================================
-- 024: Expand calendar status values + add published_url
-- ============================================================
-- New statuses:
--   saved      (임시저장) - explicitly saved draft
--   scheduled  (예약발행) - scheduled for publication
--   cancelled  (발행 취소) - publication cancelled
--
-- New column:
--   published_url text - URL of the published content

-- calendar_events: drop old constraint, add new one
alter table calendar_events drop constraint if exists calendar_events_status_check;

alter table calendar_events
  add constraint calendar_events_status_check
  check (status in ('draft','saved','in_review','in_revision','scheduled','published','cancelled'));

alter table calendar_events
  add column if not exists published_url text;

-- creatives: keep in sync with the same status values
alter table creatives drop constraint if exists creatives_status_check;

alter table creatives
  add constraint creatives_status_check
  check (status in ('draft','saved','in_review','in_revision','scheduled','published','cancelled'));
