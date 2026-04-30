-- ============================================================
-- 023: Add labels to calendar_events
-- ============================================================
-- Labels are free-form text tags stored as an array on each event.
-- Viewers and admins can add/remove labels on events they have access to.

alter table calendar_events
  add column if not exists labels text[] not null default '{}';
