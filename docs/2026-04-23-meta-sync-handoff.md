# 2026-04-23 Meta Sync Handoff

## 목표

Meta 광고 계정이 연결된 브랜드의 캠페인/지출/성과 데이터를 `campaigns`, `spend_records`, `performance_records`로 자동 동기화해서 `/dashboard`와 `/dashboard/performance`에 데이터가 보이도록 만드는 작업이다.

현재 방향은:

- Meta만 MVP 구현
- Naver는 추후 adapter 추가
- 공용 sync 구조를 먼저 깔아둔 상태

## 지금까지 완료된 것

### 설계 문서

- `docs/superpowers/specs/2026-04-22-meta-naver-campaign-sync-design.md`
- `docs/superpowers/specs/2026-04-22-meta-naver-campaign-sync-WIP.md`
- `docs/meta-sync-runbook.md`

### 코드 구현

- Meta campaign/daily metric sync용 마이그레이션 추가
  - `supabase/migrations/013_meta_sync.sql`
- 공용 sync 타입/서비스/Meta adapter 추가
  - `src/lib/ad-platform-sync/types.ts`
  - `src/lib/ad-platform-sync/normalizers.ts`
  - `src/lib/ad-platform-sync/persistence.ts`
  - `src/lib/ad-platform-sync/meta-adapter.ts`
  - `src/lib/ad-platform-sync/service.ts`
- 관리자 권한 확인 유틸 추가
  - `src/lib/admin-auth.ts`
- Meta API 유틸 확장
  - `src/lib/meta-insights.ts`
    - `date_start/date_stop` 지원
    - `timeIncrement` 지원
    - `fetchMetaCampaignsServer()` 추가
- API route 추가
  - `src/app/api/admin/sync/meta/route.ts`
  - `src/app/api/cron/meta-sync/route.ts`
- 기존 Meta mapping route 확장
  - `src/app/api/admin/meta/mapping/route.ts`
  - 계정 매핑 후 `trigger_sync=true`면 해당 브랜드 sync를 바로 1회 시도

## 아직 안 끝난 것

### 1. 실제 DB 적용

아직 `013_meta_sync.sql`은 실제 Supabase DB에 적용하지 못했다.

이 세션에서 못 한 이유:

- 로컬 환경에 `supabase` CLI 없음
- 셸에 `SUPABASE_*`, `META_*`, `CRON_SECRET` 환경변수 노출 없음

즉, 코드만 작성됐고 운영 DB 반영/실행 검증은 미실행 상태다.

### 2. 실계정 동작 검증

아직 아래를 확인하지 못했다.

- `campaigns.platform`, `external_campaign_id` 컬럼이 실제 생성되는지
- `sync_runs` 테이블이 생성되는지
- Meta 계정 매핑 후 자동 sync가 실제로 도는지
- `campaigns`, `spend_records`, `performance_records`에 row가 들어오는지
- `/dashboard`, `/dashboard/performance`에 데이터가 보이는지

### 3. 운영 연동

아직 안 한 것:

- Vercel Cron 또는 배포 환경에서 `/api/cron/meta-sync` 연결
- `CRON_SECRET` 등록
- 필요 시 관리자 UI에 “Sync Now” 버튼 추가

## 다음 AI가 바로 해야 할 일

우선순위 순서대로:

1. `supabase/migrations/013_meta_sync.sql`을 실제 프로젝트 DB에 적용
2. Meta credential 확인
3. Treasurer 또는 GVB 브랜드에 대해 수동 sync 1회 실행
4. `sync_runs` / `campaigns` / `spend_records` / `performance_records` 적재 확인
5. `/dashboard`와 `/dashboard/performance`에서 실제 표시 확인
6. 문제 있으면 Meta API 응답 shape와 upsert key를 기준으로 수정
7. 검증이 끝나면 cron 연결 또는 관리자 버튼 추가 여부 결정

## 실행 방법

### 관리자 매핑 후 즉시 sync

`POST /api/admin/meta/mapping`

```json
{
  "brand_id": "BRAND_UUID",
  "meta_account_id": "act_1234567890",
  "meta_account_name": "Treasurer",
  "trigger_sync": true
}
```

### 수동 sync

`POST /api/admin/sync/meta`

```json
{
  "brandIds": ["BRAND_UUID"],
  "since": "2026-01-23",
  "until": "2026-04-23"
}
```

### 최근 실행 로그 조회

`GET /api/admin/sync/meta?limit=20`

또는:

`GET /api/admin/sync/meta?brandIds=BRAND_UUID`

### cron 호출

`GET /api/cron/meta-sync?key=CRON_SECRET`

또는 `Authorization: Bearer CRON_SECRET`

## 확인 SQL

```sql
select platform, brand_id, account_ref, status, started_at, finished_at, summary, error_message
from sync_runs
where platform = 'meta'
order by started_at desc
limit 20;
```

```sql
select id, brand_id, name, channel, status, platform, external_campaign_id, source_account_id, last_synced_at
from campaigns
where platform = 'meta'
order by last_synced_at desc nulls last
limit 50;
```

```sql
select c.name, sr.spend_date, sr.amount
from spend_records sr
join campaigns c on c.id = sr.campaign_id
where c.platform = 'meta'
order by sr.spend_date desc
limit 50;
```

```sql
select c.name, pr.record_date, pr.values
from performance_records pr
join campaigns c on c.id = pr.campaign_id
where c.platform = 'meta'
order by pr.record_date desc
limit 50;
```

## 주의사항

### lint 상태

sync 관련 신규/수정 파일만 대상으로는 eslint 통과했다.

하지만 전체 `npm run lint`는 기존 unrelated 파일 때문에 실패한다:

- `src/app/console/_components/Filters.tsx`
- `src/components/console/Filters.tsx`
- `src/app/dashboard/ga4/page.tsx`

즉, 전체 lint 실패를 이번 작업 회귀로 오해하면 안 된다.

### 권한/보안

- `src/app/api/admin/sync/meta/route.ts`는 관리자 세션 검증 후 실행
- `src/app/api/cron/meta-sync/route.ts`는 `CRON_SECRET` 또는 `?key=` 기반
- sync 쓰기는 `createAdminClient()`로 수행

### 현재 미구현 범위

- Naver adapter
- budgets 자동 sync
- 관리자 화면에서 sync 상태 노출 UI
- 재시도/backoff 고도화

## 관련 파일

- `docs/superpowers/specs/2026-04-22-meta-naver-campaign-sync-design.md`
- `docs/meta-sync-runbook.md`
- `supabase/migrations/013_meta_sync.sql`
- `src/lib/meta-insights.ts`
- `src/lib/admin-auth.ts`
- `src/lib/ad-platform-sync/service.ts`
- `src/lib/ad-platform-sync/meta-adapter.ts`
- `src/lib/ad-platform-sync/persistence.ts`
- `src/app/api/admin/meta/mapping/route.ts`
- `src/app/api/admin/sync/meta/route.ts`
- `src/app/api/cron/meta-sync/route.ts`

## 권장 첫 액션

다른 AI가 이어받으면 첫 액션은 이것으로 충분하다:

1. Supabase CLI 또는 MCP로 `013_meta_sync.sql` 적용
2. Treasurer brand로 `/api/admin/sync/meta` 호출
3. `sync_runs`와 `campaigns` 적재 여부 확인
4. 실패 시 Meta API 응답 payload를 로그로 확인해 필드 매핑 수정
