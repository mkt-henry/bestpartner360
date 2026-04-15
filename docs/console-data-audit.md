# Console 실데이터 연결 — 현황 & 로드맵

> 작성: 2026-04-15
> 대상: `/console/*` 전체 페이지를 "목업"에서 "실데이터"로 전환하기 위한 진단 문서

---

## 배경

- 최근 커밋 흐름:
  - `6169571` — `/console` 목업 UI 생성 (7개 페이지, 모두 하드코딩)
  - `ac0d4ce` — `/console`을 기본 진입점으로 승격 시도
  - `bf87aa9` — 방향 전환. `/console`의 디자인을 `src/components/console/`로 공용화하고 **`/dashboard`** 에 이식(실데이터 연결). 미들웨어도 `/dashboard` 라우팅으로 복귀
- 결과: 현재 `/console/*`는 실사용 경로가 아니며 목업 상태. `/dashboard/*`가 실사용 경로이고 실데이터 연결됨
- 방침: **`/console` 기준으로 모든 데이터를 실데이터로 재구성**

---

## 콘솔 페이지별 데이터 커버리지

범례: ✅ 이미 있음 · ⚠️ 부분만 있음 · ❌ 완전히 없음

### 1. `/console` — Overview

| 구획 | 상태 | 비고 |
|---|---|---|
| KPI: Revenue, Spend, ROAS, CAC | ⚠️ | `spend_records` + `ga4_utm_performance.revenue` 조합 필요 |
| KPI: Sessions, Conv. Rate | ✅ | `ga4_utm_performance` |
| Revenue vs Spend 차트 (daily 14d) | ✅ | 위 두 테이블 일자별 집계 |
| Campaign Performance 테이블 | ✅ | `campaigns` + `spend_records` + `performance_records` |
| Conversion Funnel | ❌ | GA4 이벤트 단계별(begin_checkout/add_to_cart/purchase) 미저장 |
| Top Regions (도시별 매출) | ❌ | GA4 `city` 차원 미저장 |
| Devices & Channels | ❌ | GA4 `deviceCategory`, `sessionDefaultChannelGroup` 미저장 |
| Live activity / Alerts 피드 | ❌ | alerts 테이블 · 규칙 엔진 없음 |

### 2. `/console/meta-ads`

| 구획 | 상태 | 비고 |
|---|---|---|
| KPI: Spend, CTR, CPM, Frequency, Reach | ✅ | `/api/admin/meta/insights` |
| KPI: Revenue / ROAS / CAC | ⚠️ | Meta `actions`의 `purchase_value` 파싱 필요 |
| Ad Sets 테이블 | ✅ | `level=adset` |
| Creatives 그리드 | ✅ | `level=ad` + `/api/admin/meta/ad-previews` |
| Hourly heatmap (day × hour) | ❌ | `breakdowns=hourly_stats_aggregated_by_advertiser_time_zone` 추가 필요 |
| Audiences (age/gender/region) | ❌ | `breakdowns=age,gender` / `country` 추가 필요 |
| Placements | ❌ | `breakdowns=publisher_platform,platform_position` 추가 필요 |
| Schedule / Changelog | ❌ | Meta `adaccount_activities` API 미구현 |

### 3. `/console/ga4`

| 구획 | 상태 | 비고 |
|---|---|---|
| KPI: Sessions, Users (UTM 범위) | ✅ | `ga4_utm_performance` |
| KPI: Pageviews, Avg duration, Bounce, Engagement rate | ⚠️ | `/api/admin/ga4/report` 존재, 콘솔 미연결 |
| Acquisition (source/medium) | ⚠️ | GA4 Data API 리포트 설정 추가 |
| Engagement (top pages) | ⚠️ | 동일 |
| Realtime (active users, events/min) | ❌ | GA4 `runRealtimeReport` 미구현 |
| Retention / Cohort | ❌ | GA4 cohort report 미구현 |
| User Explorer | ❌ | GA4 User Explorer는 GA360 전용, 대체 구현 필요 |

### 4. `/console/crm`

| 구획 | 상태 | 비고 |
|---|---|---|
| 전부 (subscribers, flows, open/click, revenue) | ❌ | 이메일/CRM 제공사 연동 자체가 없음 |

### 5. `/console/alerts`

| 구획 | 상태 | 비고 |
|---|---|---|
| 알림 리스트, 활성 규칙 | ❌ | 테이블 · 규칙 평가 엔진 없음 |

### 6. `/console/experiments`

| 구획 | 상태 | 비고 |
|---|---|---|
| 실험 목록, 유의도, lift | ❌ | 테이블 없음 |

### 7. `/console/realtime`

| 구획 | 상태 | 비고 |
|---|---|---|
| 전부 | ❌ | GA4 Realtime API 미구현 (client 목업은 setInterval 난수) |

### 8. `/console/reports`

| 구획 | 상태 | 비고 |
|---|---|---|
| 저장된 리포트, 스케줄 | ❌ | 리포트 저장 기능 없음 |

### 9. `/console/search` — Google Search Console

| 구획 | 상태 | 비고 |
|---|---|---|
| Clicks, Impressions, CTR, Position, 쿼리 테이블 | ❌ | GSC API 연동 자체가 없음 |

### 10. `/console/settings`

| 구획 | 상태 | 비고 |
|---|---|---|
| Connected Sources | ✅ | `platform_credentials`, `meta_ad_accounts`, `ga4_properties` |
| Team | ✅ | `user_profiles` + `user_brand_access` |
| General (workspace name/tz/currency/attribution/plan) | ⚠️ | `brands` 일부 보유, 확장 필요 |

---

## 데이터 조달 방법 — 카테고리별

### 카테고리 A — 이미 DB/API에 있음, "연결"만 하면 되는 것 🟢

- `/console` Overview KPI, Campaign 테이블, Rev vs Spend 차트
- `/console/meta-ads` 기본 KPI · AdSets · Creatives (purchase_value 파싱 보강)
- `/console/ga4` UTM 범위 내 KPI
- `/console/settings` Sources · Team
- **미들웨어 확장**: 현재 `brand_ids` 헤더는 `/dashboard/*` 에서만 주입 → `/console/*` 에도 주입하도록 `isDashboard || isConsole` 조건 추가 필요

**추가 입력 필요: 없음.**

### 카테고리 B — 기존 외부 API 호출에 파라미터만 확장 🟡

- Meta Hourly Heatmap → `breakdowns=hourly_stats_aggregated_by_advertiser_time_zone`
- Meta Audiences → `breakdowns=age,gender`
- Meta Placements → `breakdowns=publisher_platform,platform_position`
- GA4 상세 리포트 (Acquisition/Engagement/Top Pages) → 새 dimension 조합
- GA4 Devices/Channels/Regions → 동일
- GA4 Realtime → `runRealtimeReport` 호출용 `/api/admin/ga4/realtime` 신설

**추가 입력 필요: 없음.** 기존 OAuth 토큰/크레덴셜 그대로 사용 가능.

### 카테고리 C — 새로운 Google OAuth 스코프 필요 🟡

- **Google Search Console** → GA4 OAuth 플로우에 `https://www.googleapis.com/auth/webmasters.readonly` 스코프 추가, `/api/admin/gsc/*` 신설
- **GA4 Funnel** (Overview) → `begin_checkout`, `add_to_cart`, `purchase` 이벤트 카운트 집계

**사용자 조치 필요**:
1. GCP에서 Search Console API 활성화
2. OAuth 동의 화면에 `webmasters.readonly` 스코프 추가 및 재동의
3. 각 브랜드의 사이트 URL을 `brands` 테이블에 등록

### 카테고리 D — 새 외부 제공사 연동 🔴

- **`/console/crm`** — 이메일/CRM 제공사 선정 필요
  - Klaviyo (권장 · flows/campaigns/metrics API 풍부)
  - Mailchimp · Stibee · Mailerlite · Customer.io

**사용자 조치 필요**:
1. 제공사 결정 (혹은 파트너별로 쓰는 도구 파악)
2. API 키 확보 → `platform_credentials` 저장

### 카테고리 E — 내부 기능, DB 설계부터 🔴

- **`/console/alerts`**:
  - `alert_rules` (metric, operator, threshold, scope)
  - `alert_events` (rule_id, fired_at, payload, status)
  - 규칙 평가기: 매 N분마다 `spend_records`/`performance_records` 훑어서 pacing/ROAS/CAC 임계 위반 감지
- **`/console/experiments`**:
  - `experiments` (name, hypothesis, platform, variant_ids, start/end)
  - `experiment_results` (conversions, lift, confidence)
  - 대부분 수동 입력 + GA4 이벤트 매칭
- **`/console/reports`**:
  - `reports` (name, config, schedule_cron, recipients)
  - `report_runs` (run_at, url, status)
  - PDF/CSV 생성기, 스케줄러
- **`/console/settings` 확장** (workspace name/currency/tz/attribution/fiscal year/API key/webhook):
  - `brands` 컬럼 추가 or 신규 `workspace_settings` 테이블

**사용자 조치 필요**:
1. 세 기능이 정말 필요한지, 아니면 `/console`에서 제거할지
2. 알림 채널 (이메일/Slack/in-app)
3. Reports PDF 포맷 참고 자료

---

## 진행 순서 (추천)

1. **Phase 1 (A 카테고리)** — 미들웨어 확장 + Overview/Meta Ads 기본/GA4 UTM/Settings 실데이터 연결 → 콘솔의 60~70% 가동
2. **Phase 2 (B 카테고리)** — Meta breakdowns + GA4 추가 리포트 + GA4 Realtime → Heatmap/Audiences/Placements/Realtime/Devices/Regions 채움 → 85% 가동
3. **Phase 3 (C 카테고리)** — 사용자 조치 후 GSC 연결, Funnel 이벤트 집계
4. **Phase 4 (D 카테고리)** — CRM 제공사 결정 후 `/console/crm` 구현
5. **Phase 5 (E 카테고리)** — alerts/experiments/reports DB 설계 및 구현

---

## 지금 필요한 결정

1. Phase 1 + 2 즉시 착수 여부
2. GSC 사용 여부 (사용 시 OAuth 스코프 추가·브랜드 URL 등록)
3. CRM 제공사 (또는 페이지 제거)
4. Alerts / Experiments / Reports 필요 여부

---

## 현재 상태 기준선

- 실사용 경로: `/dashboard/*` (콘솔 디자인 + 실데이터, 완료)
- 목업 경로: `/console/*` (디자인만, 데이터 미연결)
- 미들웨어: 로그인 시 role 기반 `/dashboard` 또는 `/admin` 으로 라우팅
- 기존 API 커버리지: Meta Insights (full), GA4 Report (UTM 중심), Naver, KPI/Budget/Credentials 관리
- 누락 API: GA4 Realtime, GSC, CRM provider, Alerts engine, Reports generator
