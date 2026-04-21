# 관리자 캘린더 — 캘린더 중심 + 모달 편집 설계서

- 작성일: 2026-04-21
- 작성자: Henry Park (+ Claude)
- 상태: 설계 확정, 구현 진행

## 배경

`/admin/calendar` 관리 페이지는 현재 **폼 + 최근 리스트** 구조다.
- 상단: `CalendarEventForm` (브랜드/캠페인/제목/채널/소재/날짜/상태/설명 입력)
- 하단: 최근 30개 이벤트 리스트 (읽기 전용, 편집/삭제 불가)

이 구조는 "언제 뭐가 있는지" 시각화가 어렵고, 이미 생성된 이벤트를 수정하거나 삭제할 UI가 없다. 뷰어 쪽엔 월/주/리스트 3종 뷰 + 필터 + 드로어를 갖춘 고도화된 `src/components/viewer/calendar/*` 가 존재하므로, 이를 **편집 가능 모드**로 확장해 관리자도 동일한 캘린더 UX를 받도록 통합한다.

## 목표

1. 관리자 캘린더 페이지를 **캘린더 그리드 중심**으로 재구성
2. 빈 날짜 셀 클릭 → **이벤트 생성 모달** (날짜 프리필)
3. 기존 이벤트 클릭 → **편집 모달** (수정/삭제)
4. 우상단 `+ 새 일정` 버튼으로 임의 날짜 생성도 가능
5. 뷰어 캘린더 컴포넌트 재사용 (코드 중복 최소화)

## 범위

**포함**
- `/admin/calendar/page.tsx` 재작성
- `src/components/viewer/calendar/CalendarView.tsx` 에 `editable` 관련 props 추가
- `MonthView` / `WeekView` / `ListView` 에 빈 날짜 셀 클릭 훅 추가
- `src/components/admin/calendar/EventEditModal.tsx` 신규 (생성/편집/삭제 통합)
- `src/components/admin/calendar/AdminCalendarShell.tsx` 신규 (클라이언트 래퍼: 모달 상태 + 캘린더 연결)

**제외**
- `/admin/calendar/[id]` 전용 상세 라우트 (모달로 충분)
- 드래그 재스케줄 (2차 개선)
- 반복 일정 / 다중 선택 / 벌크 편집
- 관리자용 별도 캘린더 컴포넌트 분기 (뷰어 컴포넌트 확장으로 통합)
- 운영현황(activities) 테이블 통합 (별도 논의)
- `CalendarEventForm.tsx` 는 삭제. 기능은 모달로 이관.

## 아키텍처

### 데이터 흐름

```
Server (/admin/calendar/page.tsx)
  ├─ brands, campaigns, events(3개월) fetch
  └─ <AdminCalendarShell brands campaigns events />

AdminCalendarShell (client)
  ├─ modalState: null | { mode: 'create'|'edit', date?: string, event?: CalendarEvent }
  ├─ <CalendarView editable onDayClick onEventClick events />
  ├─ <button "+ 새 일정"> → modalState = { mode: 'create' }
  └─ <EventEditModal open={!!modalState} ... onSaved={router.refresh} />
```

### CalendarView prop 확장

```ts
interface CalendarViewProps {
  events: CalendarEvent[]
  // 신규
  editable?: boolean
  onDayClick?: (date: string /* YYYY-MM-DD */) => void
  onEventEdit?: (event: CalendarEvent) => void
}
```

- `editable`이 true면:
  - 빈 셀 hover → `+` 아이콘 노출, 클릭 → `onDayClick(dateKey)`
  - 이벤트 Pill 클릭 → `onEventEdit(event)` (기존 `selectedEventId` 드로어 토글 로직 대신 분기)
- 기본값(false)이면 뷰어 모드 그대로 — 드로어 오픈
- MonthView/WeekView/ListView 모두 `onDayClick`/`editable` props 전달 받음

### 모달 구조

console.css의 `.modal` 은 2컬럼 (left: 프리뷰, right: 내용). 이벤트 편집엔 프리뷰가 불필요하므로 **modal-left 숨기고 modal-right만 사용**. `grid-template-columns: 1fr` 오버라이드를 인라인 스타일로.

```
┌────────────────────────────────────┐
│ 일정 생성/편집                  × │  ← modal-head
├────────────────────────────────────┤
│ 브랜드 *          캠페인            │
│ 제목 *                             │
│ 날짜 *     채널     소재유형  상태  │
│ 설명 (textarea)                    │
│                                    │
│ [삭제]              [취소] [저장]  │  ← 편집 모드만 삭제 노출
└────────────────────────────────────┘
```

- 크기: `inset: 10vh 20vw` (중앙, 최대 720px)
- 닫기: X 버튼 / ESC / 오버레이 클릭 / 취소 버튼
- 저장/삭제 → Supabase 호출 → `router.refresh()` → 모달 닫기
- 에러: 상단 토스트 대신 버튼 하단에 inline 텍스트 (임시)
- 삭제는 `window.confirm()` 로 간단 확인 (전용 컨펌 모달 생략)

### 상태 매핑

`modalState` = union:
```ts
type ModalState =
  | null
  | { mode: 'create'; initialDate?: string }
  | { mode: 'edit'; event: CalendarEvent }
```

## UI 상세

### 빈 셀 hover (MonthView)

- `editable` && 빈 셀 hover → 셀 중앙 상단에 `+` (20px, dim)
- 클릭 영역은 셀 전체 (이벤트 Pill 영역은 제외 — Pill은 자체 클릭 핸들러)

### 페이지 레이아웃

```
┌──────────────────────────────────────┐
│ 캘린더 관리           [+ 새 일정]    │ ← page-head
├──────────────────────────────────────┤
│ (CalendarView editable=true)          │
└──────────────────────────────────────┘
```

- 상단 리스트 / 별도 폼 패널 모두 제거
- 페이지 자체는 `/dashboard/calendar` 와 동일한 비주얼, 차이는 편집 가능성만

## 마이그레이션

- `src/components/admin/CalendarEventForm.tsx` 삭제
- `/admin/calendar/page.tsx` 전면 재작성 (서버 컴포넌트 유지, 클라 래퍼로 위임)
- 뷰어(`/dashboard/calendar`, `/admin/viewer/[brandId]/calendar`)는 **영향 없음** — `editable` 기본값 false로 기존 동작 보존

## 열려있는 질문

없음.
