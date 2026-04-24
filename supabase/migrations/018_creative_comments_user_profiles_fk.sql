-- ============================================================
-- 014: creative_comments -> user_profiles direct FK
-- ============================================================
-- PostgREST nested selects like
--   creative_comments(user_profiles(full_name, role))
-- require a direct foreign key between the two tables. The schema
-- originally links creative_comments.user_id and user_profiles.id
-- both to auth.users(id), which is semantically equivalent but
-- opaque to PostgREST. Add a parallel FK so the relationship
-- appears in the schema cache.

alter table creative_comments
  add constraint creative_comments_user_profiles_fk
  foreign key (user_id) references user_profiles(id) on delete cascade;
