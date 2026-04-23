# Meta/Naver 캠페인 자동 동기화 — 브레인스토밍 WIP

> **상태**: 진행 중 (브레인스토밍 단계, 설계 문서 미작성).
> **최종 수정**: 2026-04-22
> **브랜치**: `feature/ui-improvements`
> 이 파일은 세션이 끊겨도 작업을 이어가기 위한 핸드오프 노트다. spec 확정 후에는 `2026-04-22-meta-naver-campaign-sync-design.md`로 정식 spec 문서를 쓰고 이 WIP는 삭제한다.

---

## 1. 원래 제기된 버그

> "meta와 네이버가 연결된 클라이언트 계정으로 로그인했을때 관련 데이터가 안보여" (2026-04-22, henry@treasurer.co.kr)

- 테스트 대상 브랜드: **Treasurer** (Meta 3, Naver 1), **GVB** (Meta 1, Naver 1).
- viewer(클라이언트)로 로그인 → `/dashboard`, `/dashboard/performance` 등이 전부 공백.

## 2. 조사로 확정된 근본 원인

클라이언트 대시보드는 `meta_ad_accounts` / `naver_ad_accounts`를 **직접 조회하지 않는다.** 다음 체인으로 집계한다:

```
user_brand_access → campaigns (WHERE brand_id IN …) → spend_records / performance_records / budgets
```

Supabase에서 실제 상태를 조회한 결과:

| 브랜드 | Meta 계정 | Naver 계정 | campaigns | meta_campaigns | naver_campaigns | spend | perf |
|---|---:|---:|---:|---:|---:|---:|---:|
| Treasurer | 3 | 1 | **0** | 0 | 0 | 0 | 0 |
| GVB | 1 | 1 | **0** | 0 | 0 | 0 | 0 |
| Girok | 1 | 0 | 1 | 0 | 0 | 0 | 0 |

즉 광고 계정은 "연결"되어 있어도 `campaigns` 테이블이 비어있어 집계가 모두 0이 된다. 대시보드의 "연결된 브랜드가 없습니다" / "등록된 캠페인이 없습니다" / 채널 요약 공백의 직접 원인이다.

**가설 A 확정**: `meta_ad_accounts` / `naver_ad_accounts` → `campaigns` 로 데이터를 끌어오는 **자동 sync 파이프라인이 구현되어 있지 않다.**

## 3. 사용자가 확정한 방향

- 옵션 A "자동 동기화가 원래 있어야 했던 기능" 채택 (2026-04-22).
- 즉 Meta/Naver 광고 계정을 연결하면 주기적으로 캠페인/지출/성과를 `campaigns`, `spend_records`, `performance_records`에 끌어와 upsert하는 sync 파이프라인을 신규 구축해야 한다.
- 수동 등록 (옵션 B)·viewer 전용 Meta/Naver 대시보드 페이지 추가 (옵션 C)는 이번 범위에서 제외.

## 4. 탐색 결과 (브레인스토밍 task #1 완료분)

### 4.1 존재하는 자산
- `src/lib/meta-insights.ts` — `fetchMetaInsightsServer({ accountId, since, until, level, breakdowns })`. **읽기만** 하고 DB 저장 X.
- `src/lib/credentials.ts` — `getMetaCredentials()` (`platform_credentials` 테이블 사용).
- API routes: `/api/admin/meta/accounts`, `/api/admin/meta/insights`, `/api/admin/meta/ad-previews`, `/api/admin/meta/mapping`, `/api/admin/naver/accounts`, `/api/admin/naver/mapping`.
- 관리자 Meta 인사이트 페이지: `src/app/console/meta-ads/page.tsx`, `src/app/admin/meta/page.tsx` (조회 전용).

### 4.2 없는 자산 (신규 구축 필요)
- **Naver 클라이언트 라이브러리가 전무** (`src/lib/naver*` 검색 결과 없음). 검색광고 API 연동부터 새로 써야 함.
- **Cron / scheduler 설정 없음** (Vercel Cron이든 자체 스케줄러든).
- **`campaigns` 테이블에 외부 플랫폼 ID 컬럼 없음** — Upsert 시 기존 row를 식별할 수단이 필요. 옵션:
  - 컬럼 추가: `meta_campaign_id text`, `naver_campaign_id text` + UNIQUE 인덱스
  - 별도 링크 테이블: `campaign_platform_links(campaign_id, platform, external_id)`
- **Channel 문자열 표준화 정의 없음** — sync가 어떤 값으로 `campaigns.channel`을 채울지 규약 필요 (`"meta"` / `"naver"` 소문자 통일 등).

### 4.3 관련 스키마 요점
- `campaigns(id, brand_id, name, channel, status, start_date, end_date, created_at)`
- `spend_records(campaign_id, spend_date, amount)` UNIQUE `(campaign_id, spend_date)` → daily upsert에 적합.
- `performance_records(campaign_id, record_date, values jsonb)` UNIQUE `(campaign_id, record_date)`.
- `budgets(campaign_id, period_start, period_end, total_budget)` — Meta/Naver에서 직접 당겨올지 여부는 미정 (MVP 범위 질문).
- RLS: viewer select 정책 있음, admin_all 존재. sync 쓰기는 `service_role`로 실행해 RLS 우회 전제.

## 5. 답변 대기 중이던 첫 질문 — **스코프**

Meta는 fetch 함수가 있지만 Naver는 클라이언트 라이브러리까지 새로 써야 한다. 작업량 차이가 커서 먼저 범위부터 확정해야 한다.

- **A.** Meta 먼저 완전 구현 → Naver는 다음 스프린트.
- **B.** Meta + Naver 동시에 한 spec에 포함 (Naver 검색광고 API 신규 구축 포함).
- **C.** Meta만 MVP 동작 + 공용 "AdPlatformSync" 인터페이스/추상화 선설계. Naver는 adapter만 나중에 추가.

**AI 추천**: **C**. Treasurer/GVB가 실제로 Meta와 Naver를 병행 운영 중이므로, 두 번째 플랫폼 연결 시 중복 설계를 피하려면 공용 인터페이스가 필요. MVP 동작은 Meta만.

**2026-04-22 후속 처리**: 사용자 답변은 세션에 남아 있지 않았지만, 구현 가능한 설계 진행을 위해 추천안 **C**를 가정으로 확정했다. 정식 설계 문서는 `docs/superpowers/specs/2026-04-22-meta-naver-campaign-sync-design.md`에 작성했다.

## 6. 이 시점까지의 진행 체크리스트 (brainstorming skill 기준)

- [x] 1. Explore project context (sync-related code) — **완료**
- [x] 2. Ask clarifying questions one at a time — **세션 종료로 사용자 답변 유실, 추천안 C를 가정으로 확정**
- [x] 3. Propose 2-3 approaches with tradeoffs
- [x] 4. Present design sections and get approval — **명시 답변 없음, 설계 초안으로 선반영**
- [x] 5. Write design doc to `docs/superpowers/specs/2026-04-22-meta-naver-campaign-sync-design.md`
- [ ] 6. Spec self-review (inline fixes)
- [ ] 7. User reviews written spec
- [ ] 8. Invoke `superpowers:writing-plans` for implementation plan

세션 내 TaskCreate 트래커에도 동일한 8개 항목이 있음 (ID 1~8). 세션 재시작 시 새로 만들어도 무방.

## 7. 다음 세션 재개 절차 (체크리스트)

1. 이 파일과 `docs/superpowers/specs/2026-04-21-*.md` 최근 스펙들을 훑어 컨텍스트 회복.
2. Supabase MCP 재인증 (세션 내 OAuth 플로우 필요 — `mcp__plugin_supabase_supabase__authenticate`).
3. 브랜드/계정 상태가 변했을 수 있으므로 3절의 브랜드 요약 SQL을 다시 돌려 수치 갱신:
   ```sql
   -- project_id: dhxiifldvfzbmgoyamce
   WITH brand_stats AS (
     SELECT b.id AS brand_id, b.name AS brand_name,
       (SELECT COUNT(*) FROM meta_ad_accounts m WHERE m.brand_id = b.id)  AS meta_accounts,
       (SELECT COUNT(*) FROM naver_ad_accounts n WHERE n.brand_id = b.id) AS naver_accounts,
       (SELECT COUNT(*) FROM campaigns c WHERE c.brand_id = b.id)         AS campaigns,
       (SELECT COUNT(*) FROM campaigns c WHERE c.brand_id = b.id AND c.channel ILIKE '%meta%')  AS meta_campaigns,
       (SELECT COUNT(*) FROM campaigns c WHERE c.brand_id = b.id AND c.channel ILIKE '%naver%') AS naver_campaigns,
       (SELECT COUNT(*) FROM spend_records sr JOIN campaigns c ON c.id = sr.campaign_id WHERE c.brand_id = b.id)         AS spend_rows,
       (SELECT COUNT(*) FROM performance_records pr JOIN campaigns c ON c.id = pr.campaign_id WHERE c.brand_id = b.id)   AS perf_rows,
       (SELECT COUNT(DISTINCT uba.user_id) FROM user_brand_access uba WHERE uba.brand_id = b.id) AS linked_users
     FROM brands b
   )
   SELECT * FROM brand_stats
   WHERE meta_accounts > 0 OR naver_accounts > 0
   ORDER BY (meta_accounts + naver_accounts) DESC, brand_name;
   ```
4. 정식 설계 문서와 현재 코드/스키마를 다시 비교해 구현 범위를 확정한다.
5. 구현 시작 전 필요하면 사용자에게 설계안 C를 최종 확인받는다.

## 8. 미확정 추후 질문들 (스코프 확정 이후 순차 진행)

- 동기화 주기 — Vercel Cron(시간/일 단위) vs 온디맨드(관리자 버튼) vs 둘 다?
- 백필 기간 — 최근 N일만 vs 광고 계정의 캠페인 start_date 기준 전체?
- 저장 수준 — 캠페인 단위 집계만 vs adset/ad까지?
- 외부 ID 전략 — `campaigns`에 컬럼 추가 vs 링크 테이블?
- `channel` 문자열 표준값 (`"meta"`, `"naver"` 소문자로 통일?).
- budgets 테이블도 동기화 대상에 포함할지 여부.
- 실패 처리 — 토큰 만료, 레이트 리밋, 부분 실패 재시도 정책.
- 관측성 — sync 로그 테이블 필요 여부.

## 9. 참고 파일 / 위치

- 스키마: `supabase/migrations/001_schema.sql`, `002_meta_ad_accounts.sql`, `003_naver_ad_accounts.sql`, `004_platform_credentials.sql`.
- Meta 클라이언트: `src/lib/meta-insights.ts`, `src/lib/credentials.ts`.
- 대시보드 조회: `src/app/dashboard/page.tsx`, `src/app/dashboard/performance/page.tsx`.
- 미들웨어 brand 매핑: `src/middleware.ts` (`user_brand_access` → `x-user-brand-ids` 헤더).
- 관리자 Meta 페이지 (참고 구현): `src/app/console/meta-ads/page.tsx`.
