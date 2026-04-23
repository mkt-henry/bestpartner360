# Meta/Naver 캠페인 자동 동기화 설계서

- 작성일: 2026-04-22
- 작성자: Codex
- 상태: 설계 초안 작성 완료, 구현 대기

## 배경

클라이언트 대시보드와 뷰어 성과 페이지는 `meta_ad_accounts`와 `naver_ad_accounts`를 직접 읽지 않고 `campaigns`, `spend_records`, `performance_records`, `budgets`를 기준으로 집계한다. 현재 Treasurer, GVB처럼 광고 계정 매핑은 존재하지만 `campaigns`가 비어 있는 브랜드가 존재하므로, 로그인 후 대시보드에서 "연결된 브랜드가 없습니다", "등록된 캠페인이 없습니다", 채널 요약 공백 문제가 발생한다.

조사 결과 원인은 명확하다. 광고 계정 연결 이후 외부 플랫폼 데이터를 내부 집계 테이블로 가져오는 자동 sync 파이프라인이 아직 없다.

## 목표

1. Meta 광고 계정이 연결된 브랜드에 대해 캠페인 메타데이터와 일별 성과 데이터를 내부 집계 테이블로 자동 동기화한다.
2. 대시보드와 성과 페이지가 기존 조회 로직을 유지한 채 즉시 데이터를 표시하도록 만든다.
3. Naver는 이번 스프린트에서 완전 구현하지 않고, 이후 adapter만 추가하면 되는 공용 sync 구조를 먼저 만든다.
4. 수동 입력 없이 주기 실행과 재실행에 모두 안전한 upsert 기반 파이프라인을 만든다.

## 범위

**포함**
- Meta 기반 캠페인/일별 spend/일별 performance 동기화
- 공용 `AdPlatformSync` 인터페이스와 Meta adapter
- Sync 실행 서비스, 스케줄러 진입점, 수동 실행용 관리자 API
- `campaigns` 외부 ID 식별용 스키마 확장
- 최소 수준의 sync 실행 로그

**제외**
- Naver 검색광고 API 신규 연동 구현
- adset/ad 단위 내부 테이블 저장
- budgets 자동 동기화
- viewer 전용 Meta/Naver 원본 대시보드 신설
- 실시간 웹훅 기반 동기화

## 설계 결정

| # | 항목 | 선택 |
|---|---|---|
| D1 | 구현 범위 | C — Meta MVP + 공용 sync 인터페이스 선설계 |
| D2 | 외부 ID 저장 방식 | `campaigns` 컬럼 추가 |
| D3 | 채널 표준값 | 소문자 `"meta"`, `"naver"` |
| D4 | 동기화 단위 | 캠페인 단위 메타데이터 + 일별 집계 데이터 |
| D5 | 실행 방식 | Cron + 수동 재실행 API 병행 |
| D6 | 초기 백필 범위 | 최근 90일 |
| D7 | 관측성 | 경량 sync 로그 테이블 추가 |

사용자 응답이 남아 있지 않아, 위 결정은 WIP 문서의 추천안과 현 코드 구조를 기준으로 확정했다. 구현 전 사용자가 범위를 바꾸면 이 문서를 갱신한다.

## 현재 시스템 제약

- `src/app/dashboard/page.tsx`, `src/app/dashboard/performance/page.tsx`는 `campaigns`와 하위 집계 테이블만 조회한다.
- `src/lib/meta-insights.ts`는 Meta Insights API 조회 함수만 제공하며 DB 저장은 하지 않는다.
- `src/lib/credentials.ts`는 `platform_credentials`에서 Meta/Naver 자격증명을 읽을 수 있다.
- `campaigns` 테이블에는 현재 외부 플랫폼 캠페인 ID를 저장할 컬럼이 없다.
- `spend_records`와 `performance_records`는 이미 `(campaign_id, date)` unique 구조라 idempotent upsert에 적합하다.

## 아키텍처

### 구성 요소

```
src/lib/ad-platform-sync/
  types.ts
  service.ts
  meta-adapter.ts
  normalizers.ts
  persistence.ts

src/app/api/admin/sync/meta/route.ts
src/app/api/cron/meta-sync/route.ts
```

### 공용 인터페이스

```ts
export interface AdPlatformSyncAdapter {
  platform: "meta" | "naver"
  listAccounts(): Promise<PlatformAccountRef[]>
  listCampaigns(input: { account: PlatformAccountRef }): Promise<PlatformCampaign[]>
  getDailyMetrics(input: {
    account: PlatformAccountRef
    since: string
    until: string
  }): Promise<PlatformDailyMetric[]>
}
```

- `MetaSyncAdapter`는 이번 스프린트에서 실제 구현한다.
- `NaverSyncAdapter`는 타입만 맞추고 추후 추가한다.
- 서비스 계층은 플랫폼별 분기 대신 adapter 목록을 순회한다.

### 실행 흐름

```
Cron/API
  -> runAdPlatformSync({ platform: "meta", since, until, brandIds? })
    -> load mapped ad accounts from meta_ad_accounts
    -> for each account
      -> fetch campaign list
      -> upsert campaigns
      -> fetch daily campaign metrics
      -> upsert spend_records
      -> upsert performance_records
      -> write sync log
```

- 계정 단위 실패는 전체 작업을 중단하지 않고 로그에 남긴다.
- 동일 기간 재실행은 upsert로 덮어쓴다.
- 수동 실행은 특정 brand 또는 전체 Meta 계정을 대상으로 허용한다.

## 데이터 모델

### 1. `campaigns` 확장

신규 컬럼:

- `platform text null check (platform in ('meta', 'naver'))`
- `external_campaign_id text null`
- `source_account_id text null`
- `last_synced_at timestamptz null`

신규 인덱스/제약:

- unique index on `(platform, external_campaign_id)` where `external_campaign_id is not null`
- index on `(brand_id, platform)`

선택 이유:

- 현재 조회 경로가 모두 `campaigns` 중심이라 링크 테이블보다 단순하다.
- 플랫폼당 외부 ID가 고유하므로 재실행 식별자 역할을 바로 수행할 수 있다.
- 관리자 UI, 리포트, 알림 평가기까지 최소 수정으로 흡수 가능하다.

### 2. `sync_runs` 로그 테이블

```sql
create table sync_runs (
  id uuid primary key default uuid_generate_v4(),
  platform text not null check (platform in ('meta', 'naver')),
  brand_id uuid references brands(id) on delete set null,
  account_ref text,
  status text not null check (status in ('running', 'success', 'partial', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb not null default '{}',
  error_message text
);
```

`summary` 예시:

```json
{
  "campaigns_upserted": 12,
  "spend_rows_upserted": 90,
  "performance_rows_upserted": 90,
  "since": "2026-01-22",
  "until": "2026-04-22"
}
```

이 테이블은 사용자 화면 노출보다 운영 추적용이다. RLS는 admin 전용으로 두고 sync는 `service_role`로 쓴다.

## Meta 동기화 상세

### 계정 소스

- 입력 소스는 `meta_ad_accounts(brand_id, meta_account_id, meta_account_name)`다.
- 각 row를 하나의 동기화 단위로 취급한다.

### 캠페인 목록 수집

Meta Insights는 캠페인 지표는 제공하지만 캠페인 상태, 시작일, 종료일을 안정적으로 모두 담지 않으므로 캠페인 메타데이터는 별도 Graph API 조회를 사용한다.

예시:

`GET /{ad_account_id}/campaigns?fields=id,name,status,effective_status,start_time,stop_time`

정규화 규칙:

- `channel` = `"meta"`
- `platform` = `"meta"`
- `external_campaign_id` = Meta `campaign.id`
- `source_account_id` = `meta_account_id`
- `status`
  - `ACTIVE` -> `active`
  - `PAUSED` -> `paused`
  - 종료 계열 나머지 -> `ended`
- `start_date` = `start_time`가 있으면 해당 날짜, 없으면 sync 실행일
- `end_date` = `stop_time`가 있으면 해당 날짜, 없으면 null

### 일별 지표 수집

`src/lib/meta-insights.ts`를 재사용하되 아래와 같이 확장한다.

- `level: "campaign"`
- `time_increment: 1`
- 필요한 필드:
  - `campaign_id`
  - `campaign_name`
  - `date_start`
  - `date_stop`
  - `impressions`
  - `clicks`
  - `reach`
  - `spend`
  - `cpc`
  - `cpm`
  - `ctr`
  - `frequency`
  - `actions`
  - `action_values`

저장 규칙:

- `spend_records.amount` = 일별 `spend`
- `performance_records.values` =
  - `impressions`
  - `clicks`
  - `reach`
  - `ctr`
  - `cpc`
  - `cpm`
  - `frequency`
  - `purchase_count`
  - `purchase_value`

`purchase_count`와 `purchase_value`는 기존 `extractPurchaseCount`, `extractPurchaseValue`를 재사용한다.

### 백필 범위

- 최초 구현 기본값은 최근 90일
- 수동 API는 `since`, `until` override 허용
- 추후 Naver까지 붙으면 플랫폼 공통 설정으로 승격 가능

## API / 스케줄링

### Cron

`GET /api/cron/meta-sync`

- 인증: 내부 `CRON_SECRET` 헤더 또는 쿼리 기반 보호
- 동작: 전체 Meta 계정 대상 최근 90일 sync
- 반환: 계정별 성공/실패 요약 JSON

### 관리자 수동 실행

`POST /api/admin/sync/meta`

request body:

```json
{
  "brandIds": ["..."],
  "since": "2026-01-22",
  "until": "2026-04-22"
}
```

- admin 권한 필요
- 지정한 브랜드의 Meta 계정만 동기화
- 운영자가 계정 연결 직후 즉시 데이터 반영할 때 사용

## 실패 처리

- 한 계정 fetch 실패는 `sync_runs.status = failed` 또는 `partial`로 저장
- 나머지 계정은 계속 진행
- Meta 토큰 부재 시 작업 전체를 실패 처리하고 원인 메시지를 남긴다
- API rate limit은 지수 백오프 2~3회 후 실패 처리
- DB upsert 실패는 해당 계정 작업을 중단하고 다음 계정으로 진행

## 보안 / 권한

- 읽기/쓰기 모두 서버 전용 `createAdminClient()`를 사용한다.
- 일반 viewer/admin 세션으로 sync를 직접 수행하지 않는다.
- Cron과 관리자 수동 실행 API는 모두 서버측 권한 검사를 거친다.
- `platform_credentials`의 access token은 로그에 절대 기록하지 않는다.

## 구현 단계

1. 스키마 마이그레이션 추가
2. Meta campaign 목록 fetch 유틸 추가
3. 공용 sync 타입/서비스/persistence 추가
4. Meta adapter 구현
5. Cron/API route 추가
6. 최소 운영 로그 조회 경로 또는 SQL 확인 절차 추가
7. Treasurer, GVB 계정 기준 수동 sync 검증

## 테스트 / 검증

### 단위 테스트

- 상태값 정규화
- purchase count/value 추출
- platform metric -> DB row 변환
- idempotent upsert key 생성

### 통합 검증

- Meta 계정 1개 연결 브랜드에서 `campaigns` row가 생성되는지
- 같은 범위 재실행 시 row 수가 증가하지 않고 값만 갱신되는지
- `dashboard`와 `dashboard/performance`에서 데이터가 노출되는지
- 일부 계정 실패 시 다른 브랜드 데이터는 유지되는지

## 오픈 이슈

1. budgets를 Meta에서 끌어올지, 현행 수동 입력을 유지할지 아직 미정이다.
2. Cron 주기는 하루 1회면 충분한지, 업무 시간 중 추가 실행이 필요한지 추후 운영 판단이 필요하다.
3. Naver adapter 구현 시 인증 서명, 리포트 필드, 캠페인 상태 매핑을 별도 설계해야 한다.

## 구현 시 참고 파일

- `src/lib/meta-insights.ts`
- `src/lib/credentials.ts`
- `src/lib/supabase/admin.ts`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/performance/page.tsx`
- `supabase/migrations/001_schema.sql`
- `supabase/migrations/002_meta_ad_accounts.sql`
- `supabase/migrations/003_naver_ad_accounts.sql`
- `supabase/migrations/004_platform_credentials.sql`
