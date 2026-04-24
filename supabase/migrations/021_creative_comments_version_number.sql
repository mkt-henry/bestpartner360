-- ============================================================
-- 017: Per-version feedback on creative_comments
-- ============================================================
-- Each comment now targets a specific creative_version by its
-- version_number so admins can review feedback against the exact
-- version a viewer was looking at when they wrote it. Nullable to
-- preserve any legacy thread-level comments (UI falls back to v1).

alter table creative_comments
  add column if not exists version_number integer;

create index if not exists creative_comments_creative_version_idx
  on creative_comments(creative_id, version_number);
