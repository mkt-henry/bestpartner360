-- ============================================================
-- 011: Link creatives to calendar_events
-- ============================================================
-- Adds optional FK so multiple creatives can be attached to a
-- single calendar event (= a scheduled publication). Deletion of
-- the event detaches (set null) but does not cascade-delete creatives.

alter table creatives
  add column if not exists calendar_event_id uuid
  references calendar_events(id) on delete set null;

create index if not exists creatives_calendar_event_id_idx
  on creatives(calendar_event_id);
