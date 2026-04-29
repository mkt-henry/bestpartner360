alter table creative_versions
  add column if not exists original_filename text;
