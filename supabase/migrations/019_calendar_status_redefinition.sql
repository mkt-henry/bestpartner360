-- ============================================================
-- 015: Calendar status redefinition
-- ============================================================
-- Collapse the legacy 6-value status enum into 4 values aligned
-- with the publication lifecycle the agency operates on.
--
--   published    (발행)   - was: completed
--   draft        (미발행) - was: draft, upload_scheduled
--   in_review    (컨펌중) - was: review_requested, feedback_pending
--   in_revision  (수정중) - was: in_revision
--
-- Applies to calendar_events and creatives (same enum).

-- calendar_events
alter table calendar_events drop constraint if exists calendar_events_status_check;

update calendar_events set status = case status
  when 'completed'         then 'published'
  when 'upload_scheduled'  then 'draft'
  when 'review_requested'  then 'in_review'
  when 'feedback_pending'  then 'in_review'
  else status
end
where status in ('completed','upload_scheduled','review_requested','feedback_pending');

alter table calendar_events
  add constraint calendar_events_status_check
  check (status in ('published','draft','in_review','in_revision'));

-- creatives
alter table creatives drop constraint if exists creatives_status_check;

update creatives set status = case status
  when 'completed'         then 'published'
  when 'upload_scheduled'  then 'draft'
  when 'review_requested'  then 'in_review'
  when 'feedback_pending'  then 'in_review'
  else status
end
where status in ('completed','upload_scheduled','review_requested','feedback_pending');

alter table creatives
  add constraint creatives_status_check
  check (status in ('published','draft','in_review','in_revision'));
