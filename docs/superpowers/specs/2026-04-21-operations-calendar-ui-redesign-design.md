# 운영 캘린더 UI 전면 개편 설계서

- 작성일: 2026-04-21
- 작성자: Henry Park (+ Claude)
- 상태: 설계 확정, 구현 대기

## 배경

`src/components/viewer/CalendarView.tsx`는 `/dashboard/calendar`와 `/admin/viewer/[brandId]/calendar`에서 공유되는 읽기 전용 캘린더 컴포넌트다. 최근 커밋 `3cceed1 feat: UI 개선 — 뷰어/대시보드 전면 리팩토링`에서 뷰어/대시보드 전체가 콘솔 다크 디자인 시스템(`src/styles/console.css`)으로 통일됐지만, 이 캘린더만 옛 화이트 테마 Tailwind 스타일(`bg-white`, `border-slate-200`, `bg-blue-600`)로 남아 톤앤매너 불일치가 크다. 또한 기능 측면에서도 월 뷰 단일, 채널 색상 미반영, 필터 없음, 고정 사이드 패널이 캘린더 폭을 줄이는 구조 등 운영팀이 실제로 쓰기 어려운 상태다.

## 목표

1. 콘솔 다크 디자인 시스템으로 완전 통합 (`var(--bg-1)`, `var(--amber)`, `.tag.*`, `.chip` 등 기존 토큰 재사용)
2. 월 / 주 / 리스트 3종 뷰 제공
3. 채널 · 상태 · 소재 유형 chip 필터 + 제목 검색
4. 우측 슬라이드 드로어로 상세 표시 (캘린더 풀폭 유지)
5. URL 쿼리스트링 동기화로 필터/뷰/날짜 공유 가능
6. 모바일 반응형

## 범위

**포함**
- `src/components/viewer/CalendarView.tsx` 전면 재작성 (서브모듈 분할)
- 관련 `lib/calendar-utils.ts` 신규
- `hooks/useCalendarFilters.ts` 신규
- 호출부(`/dashboard/calendar`, `/admin/viewer/[brandId]/calendar`)는 props 인터페이스가 동일하게 유지되므로 변경 없음

**제외**
- `/admin/calendar` 관리 페이지 (별도 컴포넌트 사용)
- 편집 기능 (드래그 재스케줄, 인라인 편집)
- 새로운 API 엔드포인트 / 데이터 범위 확장 (현재 서버의 3개월 고정 범위 유지)
- 전용 접근성 스프린트 (기본 수준만)
- E2E 테스트

## 설계 결정 (사용자 합의)

| # | 결정 | 선택 |
|---|---|---|
| Q1 | 개선 범위 | C — 전면 개편 |
| Q2 | 뷰 모드 | C — 월 / 주 / 리스트 3종 토글 |
| Q3 | 필터 축 | D — 채널 + 상태 + 소재 유형 + 검색박스 |
| Q4 | +N 오버플로우 | A — 팝오버 (해당 날짜 위에 플로팅) |
| Q5 | 이벤트 상세 표시 | B — 우측 슬라이드 드로어 |
| Q6 | 데이터 로딩 | A — 서버의 3개월 고정 범위 유지, 범위 밖은 배너로 명시 |
| Q7 | URL 동기화 | A — 필터/뷰/날짜를 쿼리스트링에 반영 |
| Q8 | 요일 헤더 | 한글 (일 월 화...) |

## 아키텍처

### 컴포넌트 구조

```
src/components/viewer/calendar/
  CalendarView.tsx         # 오케스트레이터 (상태 관리, URL 동기화)
  CalendarHeader.tsx       # 월/주 네비 + "오늘" + 뷰 토글
  CalendarFilters.tsx      # 채널/상태/소재 chip + 검색 + 초기화
  views/
    MonthView.tsx          # 월 그리드 (7×5~6)
    WeekView.tsx           # 주 뷰 (7열 세로 리스트)
    ListView.tsx           # 아젠다 (날짜 그룹)
  EventPill.tsx            # 3개 뷰 공통 이벤트 한 줄
  EventDrawer.tsx          # 우측 슬라이드 상세
  DayPopover.tsx           # +N 더보기 팝오버
  hooks/
    useCalendarFilters.ts  # URL <-> 필터 상태 동기화
  lib/
    calendar-utils.ts      # 날짜 / 필터 / 그룹핑 순수 함수
```

### 상태 소유

`CalendarView`가 유일한 허브.

- `currentDate: Date` — 표시 기준월/주
- `viewMode: 'month' | 'week' | 'list'`
- `filters: { channels: Set<string>, statuses: Set<string>, assetTypes: Set<string>, query: string }`
- `selectedEventId: string | null` — 드로어 제어
- `popoverDay: string | null` — +N 팝오버 제어 (날짜 키 `YYYY-MM-DD`)

하위 컴포넌트는 props로 상태와 setter를 받는 단순 뷰 컴포넌트.

### 데이터 흐름

```
Server (page.tsx)
  └─ fetch calendar_events [month-1, month+2] → events[]
        │
        ▼
CalendarView (client)
  ├─ parseSearchParams(useSearchParams()) → 초기 filters/view/date
  ├─ useMemo filteredEvents = applyFilters(events, filters)
  ├─ useMemo distinctChannels/statuses/assetTypes = pluck(events)
  │
  ├─ 상태 변경 → buildSearchParams → router.replace({ scroll: false })
  │
  └─ props 전달
        ├─ CalendarHeader (currentDate, viewMode, setters)
        ├─ CalendarFilters (filters, options, setters)
        ├─ views/* (filteredEvents, currentDate, onEventClick, onDayOverflow)
        ├─ EventDrawer (event, onClose)
        └─ DayPopover (day, events, onClose, onEventClick)
```

### URL 표현

```
/dashboard/calendar?view=week&date=2026-04-15
  &channels=Meta,Google
  &statuses=review_requested,feedback_pending
  &types=image
  &q=봄
```

- 빈 축은 키 생략
- 잘못된 값은 무시하고 기본값으로 폴백 (에러 UI 없음)
- 검색어는 200ms debounce 후 URL 반영
- `date`는 뷰별 의미: 월 뷰 = 표시할 월(일자 무관), 주 뷰 = 표시할 주에 속한 일자, 리스트 뷰 = 초기 스크롤 앵커. 생략 시 오늘 기준.

## 디자인 언어

### 토큰 매핑 (console.css 재사용)

- 배경: `var(--bg-1)` 패널, `var(--bg-2)` 셀 호버, `var(--line)` 경계
- 텍스트: `var(--text)` / `var(--text-2)` / `var(--dim)` / `var(--dimmer)`
- 강조: `var(--amber)` (오늘, 활성 탭, 선택 이벤트 좌측바)
- 상태: `--good` / `--amber` / `--bad` / `--steel` / `--plum` (기존 `.tag.*`와 동일)

### 타이포

- 월 타이틀: `font-family: var(--c-serif); font-size: 22px; font-weight: 400; letter-spacing: -.015em`
- 요일 헤더: 한글 약어, `font-size: 10px; text-transform: uppercase; letter-spacing: .12em; color: var(--dim)` (한글에는 uppercase 무효지만 letter-spacing만 적용)
- 날짜 숫자: `var(--c-mono)` 11px, 오늘만 amber
- 이벤트 제목: 11px `var(--text)`, ellipsis

### EventPill (3개 뷰 공통)

```
┌────────────────────────────────┐
│ ▌ [Meta] 봄 시즌 론칭 소재 검토 • │
└────────────────────────────────┘
```

- 좌측 2px 세로바: 채널 색상 (`.tag.meta` 팔레트에서 파생)
- 채널 태그: `.tag.meta/.instagram/...` 그대로
- 상태는 Pill 우측 끝에 컬러 점 1개 (복잡도 절감), 리스트뷰/드로어에서는 텍스트 병기 (색약 대비)
- 호버: `background: var(--bg-2)`
- 선택됨: 좌측바 amber로 전환

### 월 뷰 셀

- 기본 높이 `min-height: 110px` (기존 80 → 여유)
- 오늘: 날짜 숫자 amber + 셀 좌상단 amber 2px 외곽선 액센트
- 주말: 토요일 숫자 `var(--steel)`, 일요일 숫자 `var(--bad)` (아주 연하게)
- 다른 달 채움 셀: `background: var(--bg)`, 숫자 `var(--dimmer)`

### 전체 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│ 운영 캘린더                           XX건 · 2026-03 ~ 05 │ ← page-head
├─────────────────────────────────────────────────────────┤
│ [< 2026년 4월 >]  [오늘]              [월|주|리스트]       │ ← CalendarHeader
├─────────────────────────────────────────────────────────┤
│ 채널: [Meta][Instagram]... · 상태: ... · 소재: ...        │
│ 🔍 제목 검색_______________         [필터 초기화 (3)]       │ ← CalendarFilters
├─────────────────────────────────────────────────────────┤
│                                                         │
│       (뷰 영역 — 월 그리드 / 주 리스트 / 아젠다)           │
│                                                         │
└─────────────────────────────────────────────────────────┘
                    ▲ 이벤트 클릭 시 우측에서 Drawer 슬라이드 인
```

## 뷰 모드 상세

### 월 뷰 (MonthView)

- 7열 × 5~6주, 셀 `min-height: 110px`
- 셀당 Pill 최대 3개, 그 이상은 `+N 더보기`
- Pill 정렬: 상태 우선순위 (`review_requested` → `feedback_pending` → `in_revision` → `upload_scheduled` → `completed` → `draft`)
- +N 클릭 → DayPopover 열림
- 오늘 강조: 날짜 amber + 셀 좌상단 외곽선 액센트

### 주 뷰 (WeekView)

이벤트 데이터에 시간 정보가 없어 **7일 × 세로 리스트** 레이아웃 (시간그리드 아님).

```
월 4/14    화 4/15    수 4/16    목 4/17    금 4/18    토 4/19    일 4/20
─────────────────────────────────────────────────────────────────────
▌Meta      ▌Google    ▌Insta     (빈 열)    ▌Meta      (주말)     (주말)
소재검토    신규광고    스토리                피드백
                      ▌Kakao                ▌Naver
                      쿠폰                   배너개편
```

- 7열 grid, 각 열 상단에 요일+날짜 (오늘 amber)
- 열 내부 Pill 세로 스택, 개수 제한 없음 (열 스크롤)
- 빈 열: "— 일정 없음" dim 중앙정렬
- 헤더 타이틀: `2026년 4월 14일 – 20일 (16주차)`
- `< >` 네비: 1주 전/후

### 리스트 뷰 (ListView)

```
┌─────────────────────────────────────────────┐
│ 오늘 · 2026년 4월 21일 월                      │
│   ▌[Meta] 봄 시즌 A안 검토 요청  · 초안         │
│   ▌[Google] 키워드 개편 배포     · 업로드 예정   │
├─────────────────────────────────────────────┤
│ 내일 · 4월 22일 화                             │
│   ▌[Insta] 릴스 #3 피드백 대기                  │
└─────────────────────────────────────────────┘
```

- 현재 표시 범위 3개월 전체 대상, 필터 적용
- 그룹 헤더: "오늘/내일/어제" 라벨 + 절대 날짜 (상대 표현은 ±3일 이내만)
- 그룹 내부 정렬: 상태 우선순위
- 오늘 그룹: 좌측 2px amber 바 + 배경 `var(--bg-2)` 아주 연하게
- 초기 진입 시 오늘로 스크롤, `< >` → 이전/다음 달로 스크롤

### 뷰 전환 시 상태 보존

- `currentDate`, `filters`, `selectedEventId` 유지
- 월 → 주: `currentDate`가 속한 주로
- 주 → 월: `currentDate`가 속한 월로
- 리스트 ↔ 월/주: `currentDate` 유지

## 필터 / 드로어 / 팝오버

### CalendarFilters

- chip 토글 (`.chip` / `.chip.on`)
- 선택 없음 = 해당 축 미필터
- 축 내부 = OR, 축 간 = AND
- 검색: 제목 substring (대소문자 무관), 200ms debounce
- "필터 초기화 (N)" — N은 활성 축 수
- 옵션은 events distinct에서 도출 (데이터 없는 채널은 노출 안 됨)
- `null` channel/asset_type은 "미지정" 옵션 자동 생성
- 필터 미매칭 시:
  - 월: 빈 셀
  - 주/리스트: empty state + 필터 초기화 CTA
- `page-head.sub`에 "XX건 / 전체 YY건 중" 표기

### EventDrawer

- `position: fixed; top: 0; right: 0; height: 100vh; width: 380px; z-index: 40`
- 애니메이션: `transform: translateX(100%) → 0`, `transition: transform .28s cubic-bezier(.2,.7,.2,1)`
- 오버레이 없음, 캘린더 상호작용 유지
- 닫기: X 버튼 / ESC / 같은 이벤트 재클릭 (토글). 드로어 밖 클릭으로는 **닫히지 않음** (여러 이벤트 비교 시나리오)
- 다른 이벤트 클릭 → 내용만 교체, 드로어 유지

내용 구조:
```
┌────────────────────────────────┐
│ [Meta] 봄 시즌 A안 검토 요청   × │
├────────────────────────────────┤
│ 상태    [피드백 대기]           │
│ 날짜    2026-04-15 (수) · 오늘  │
│ 채널    Meta                   │
│ 소재    이미지                 │
├────────────────────────────────┤
│ 설명                           │
│ 본문 단락                      │
└────────────────────────────────┘
```

- 헤더 = 콘솔 `.modal-head` 축소판 (h2 22px serif)
- 메타: `grid-template-columns: 60px 1fr`, 라벨 dim uppercase
- 날짜 옆 상대표현(`오늘` / `어제` / `3일 후`) amber 서브
- 설명 없으면 섹션 숨김

### DayPopover

- `document.body` 포털, `position: absolute` 좌표 계산
- `background: var(--bg-1); border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 12px 40px #000a`
- 헤더: `14px 16px`, 날짜 + 건수 + 닫기 X
- 본문: Pill 리스트, `max-height: 360px; overflow-y: auto`
- 뷰포트 경계 보정: 셀이 우측 경계 근처면 왼쪽 정렬로 뒤집음
- 닫기: ESC / 외부 클릭 / X 버튼 / 다른 +N 클릭 시 전환

## 반응형

| 브레이크포인트 | 변경 |
|---|---|
| ≥1280px | 기본 레이아웃 |
| 900~1279px | 필터 축 라벨 숨김, 셀 높이 90px, Pill 2개+N, 드로어 320px |
| ≤899px | 뷰 기본값 리스트로 강제. 월 뷰는 셀 60px + 채널점 4개만. 주 뷰는 1열 세로. 드로어는 전체화면 |

## 엣지케이스

| 상황 | 처리 |
|---|---|
| events 빈 배열 | 구조 유지, `page-head.sub`에 "등록된 일정이 없습니다" |
| 필터 결과 0건 | 월: 빈 셀 / 주·리스트: empty state + 초기화 CTA |
| 범위 밖 월 이동 | 셀은 그려지되 "이 월은 데이터 범위 밖입니다" 배너 표시 |
| 잘못된 URL 쿼리 | 무시, 기본값 폴백 |
| 선택 이벤트가 필터에서 빠짐 | 드로어 유지 (필터는 목록만 필터링, 선택 컨텍스트는 보존) |
| 이벤트 20개+ | Pill 3 + `+17 더보기` → 팝오버 스크롤 |
| 제목 매우 김 | Pill ellipsis, Drawer에서 전체 표시 |
| channel/asset_type null | "미지정" 옵션, Pill 좌측바 `var(--dimmer)` |
| 타임존 | `event_date`는 문자열(`YYYY-MM-DD`) 비교, 오늘 계산만 로컬 타임존 |

## 접근성 (기본 수준)

- 드로어/팝오버 ESC 닫기
- 팝오버 외부 클릭 닫기
- 필터 chip: `<button aria-pressed>`
- 이벤트 Pill: `<button aria-label="채널 · 제목 · 상태 · 날짜">`
- 오늘 셀: `aria-current="date"`
- 드로어 오픈 시 닫기 버튼으로 포커스 이동 (트랩은 안 함)
- 색만으로 상태 구분되지 않도록 Drawer / 리스트뷰는 상태 텍스트 병기

## 로딩 / 에러

- 서버 컴포넌트가 events를 프롭 전달 → 클라 측 로딩 없음
- 쿼리 실패 시 `events ?? []`
- 에러 UI는 상위 페이지 책임, 이 컴포넌트는 추가 안 함

## 테스트

- `lib/calendar-utils.ts` 순수 함수 유닛테스트 (Vitest):
  - `groupEventsByDate`
  - `applyFilters`
  - `getVisibleRange(date, view)`
  - `getRelativeDateLabel(date, today)`
  - `buildSearchParams` / `parseSearchParams`
- 뷰 컴포넌트: 스모크 수준 (Pill 렌더, chip 클릭 → 필터, 이벤트 클릭 → 드로어)
- E2E 없음. `/dashboard/calendar`와 `/admin/viewer/[brandId]/calendar` 로컬 dev에서 육안 확인

## 마이그레이션

- 기존 `src/components/viewer/CalendarView.tsx`는 삭제하고 `src/components/viewer/calendar/CalendarView.tsx`로 신규 작성
- import 경로는 page에서 변경 (`@/components/viewer/CalendarView` → `@/components/viewer/calendar/CalendarView`)
- props 인터페이스(`{ events: CalendarEvent[] }`)는 유지 → 호출부 수정 최소화

## 열려있는 질문

없음. 모든 결정 확정됨.
