# Meta Sync Runbook

## 개요

Meta 캠페인 자동 동기화는 아래 순서로 동작한다.

1. `meta_ad_accounts`에 브랜드와 Meta 광고 계정을 매핑한다.
2. 서버가 Meta API에서 캠페인/일별 성과를 읽는다.
3. 내부 `campaigns`, `spend_records`, `performance_records`에 upsert한다.
4. 실행 결과는 `sync_runs`에 기록된다.

## 선행 조건

- `supabase/migrations/013_meta_sync.sql` 적용
- `platform_credentials` 또는 환경변수에 Meta access token 설정
- 서버 환경변수:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET` (권장)

## 관리자 수동 실행

### 1. 계정 매핑과 동시에 sync

`POST /api/admin/meta/mapping`

```json
{
  "brand_id": "BRAND_UUID",
  "meta_account_id": "act_1234567890",
  "meta_account_name": "Treasurer",
  "trigger_sync": true
}
```

- `trigger_sync` 생략 시 기본값은 `true`
- 매핑은 성공했지만 sync가 실패할 수 있으므로 응답의 `sync_error`를 확인한다.

### 2. 특정 브랜드 재실행

`POST /api/admin/sync/meta`

```json
{
  "brandIds": ["BRAND_UUID"],
  "since": "2026-01-23",
  "until": "2026-04-23"
}
```

## 최근 실행 로그 조회

`GET /api/admin/sync/meta?limit=20`

특정 브랜드만 조회:

`GET /api/admin/sync/meta?brandIds=BRAND_UUID`

## Cron 실행

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
select id, brand_id, name, channel, platform, external_campaign_id, source_account_id, last_synced_at
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

## 현재 제한 사항

- Naver adapter는 아직 미구현
- budgets 자동 동기화 미구현
- 전체 lint는 기존 unrelated 파일 오류로 깨져 있으나, sync 관련 신규 파일들은 개별 eslint 통과
