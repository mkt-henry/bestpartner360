-- ============================================================
-- CAMPAIGNS.sync_tag (지출 동기화 매칭 태그)
--   - Meta 채널(Instagram/Facebook 등): 광고 캠페인명에 포함될 부분문자열
--       예: "IG", "FB", "brand-event-2025"
--   - Naver: 네이버 검색광고 campaignTp에 매핑되는 한국어 라벨
--       파워링크=WEB_SITE, 브랜드검색=BRAND_SEARCH,
--       쇼핑검색=SHOPPING, 파워컨텐츠=POWER_CONTENTS
--   - NULL인 기간 세트는 지출 동기화 대상에서 제외
-- ============================================================
alter table campaigns add column if not exists sync_tag text;
