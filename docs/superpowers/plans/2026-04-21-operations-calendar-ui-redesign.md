# 운영 캘린더 UI 전면 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `src/components/viewer/CalendarView.tsx`를 콘솔 다크 디자인 시스템으로 완전 이식하고 월/주/리스트 3종 뷰 + chip 필터 + 우측 드로어 + +N 팝오버 + URL 쿼리 동기화를 지원하는 운영 캘린더로 재작성한다.

**Architecture:** 단일 파일을 `src/components/viewer/calendar/` 디렉토리로 분할. `CalendarView`가 상태 허브(클라이언트 컴포넌트)이고, 하위 뷰/필터/드로어/팝오버는 props 드라이브 순수 뷰 컴포넌트. 날짜·필터 로직은 `lib/calendar-utils.ts` 순수 함수로 분리. URL 동기화는 `useCalendarFilters` 훅에서 처리.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, `date-fns`, `lucide-react`, `@/types`의 기존 `CalendarEvent`/`CalendarEventStatus`/`STATUS_LABELS`, `src/styles/console.css`의 기존 토큰(`var(--bg-1)`, `var(--amber)`, `.tag.*`, `.chip`, `.btn`, `.panel` 등).

**사양서 대비 편차 (고정, 실행자는 따라갈 것):**
- 사양서에는 "Vitest 단위테스트"가 있으나 프로젝트에 테스트 러너가 설치돼 있지 않음(기존 테스트 파일 0개). 테스트 러너를 새로 도입하는 것은 이 기능의 범위를 넘음. **순수 함수는 testable 하게 구조만 유지**하고, 형식 검증은 **TypeScript 컴파일 + `next build` + 브라우저 육안 확인**으로 갈음한다. 향후 프로젝트에 테스트 인프라가 도입되면 `calendar-utils.ts`에 대해 즉시 유닛테스트 작성 가능하도록 순수/결정적으로 작성할 것.

---

## 파일 구조

```
src/components/viewer/calendar/         [신규]
  CalendarView.tsx                      Task 11
  CalendarHeader.tsx                    Task 7
  CalendarFilters.tsx                   Task 6
  EventPill.tsx                         Task 3
  EventDrawer.tsx                       Task 5
  DayPopover.tsx                        Task 4
  views/MonthView.tsx                   Task 8
  views/WeekView.tsx                    Task 9
  views/ListView.tsx                    Task 10
  hooks/useCalendarFilters.ts           Task 2
  lib/calendar-utils.ts                 Task 1

src/styles/console.css                  Task 12 (섹션 추가)

src/app/dashboard/calendar/page.tsx                     Task 13 (import 수정)
src/app/admin/viewer/[brandId]/calendar/page.tsx        Task 13 (import 수정)
src/components/viewer/CalendarView.tsx                  Task 13 (삭제)
```

---

## Task 1: `lib/calendar-utils.ts` — 순수 함수 레이어

모든 날짜 계산·필터링·URL 직렬화를 한 곳에 모아 결정적(determinstic)으로 유지한다. UI 의존성 없음.

**Files:**
- Create: `src/components/viewer/calendar/lib/calendar-utils.ts`

- [ ] **Step 1: 파일 생성**

```typescript
// src/components/viewer/calendar/lib/calendar-utils.ts
import {
  addDays, addMonths, addWeeks, differenceInCalendarDays,
  endOfMonth, endOfWeek, format, getDay, getDaysInMonth,
  getISOWeek, isSameMonth, parseISO, startOfMonth, startOfWeek,
} from "date-fns"
import type { CalendarEvent, CalendarEventStatus } from "@/types"

export type ViewMode = "month" | "week" | "list"

export interface CalendarFilters {
  channels: Set<string>
  statuses: Set<string>
  assetTypes: Set<string>
  query: string
}

export const EMPTY_FILTERS: CalendarFilters = {
  channels: new Set(),
  statuses: new Set(),
  assetTypes: new Set(),
  query: "",
}

export const UNASSIGNED = "__unassigned__"

export const CHANNEL_COLORS: Record<string, string> = {
  Meta: "#1877F2",
  Facebook: "#1877F2",
  Instagram: "#E1306C",
  Google: "#4285F4",
  Naver: "#03c75a",
  Kakao: "#FEE500",
  TikTok: "#ff0040",
  YouTube: "#FF0000",
  GA4: "#FBBC05",
}

export function channelTagClass(channel: string | null): string {
  if (!channel) return "tag neutral"
  const key = channel.toLowerCase()
  const known = ["meta", "instagram", "facebook", "google", "naver", "kakao", "tiktok", "youtube", "ga4"]
  return known.includes(key) ? `tag ${key}` : "tag neutral"
}

export function channelColor(channel: string | null): string {
  if (!channel) return "var(--dimmer)"
  return CHANNEL_COLORS[channel] ?? "var(--dim)"
}

const STATUS_ORDER: CalendarEventStatus[] = [
  "review_requested",
  "feedback_pending",
  "in_revision",
  "upload_scheduled",
  "completed",
  "draft",
]

export function statusPriority(status: string): number {
  const idx = STATUS_ORDER.indexOf(status as CalendarEventStatus)
  return idx === -1 ? 999 : idx
}

export const STATUS_DOT_COLOR: Record<string, string> = {
  draft: "var(--dimmer)",
  review_requested: "var(--steel)",
  feedback_pending: "var(--amber)",
  in_revision: "#e08a5a",
  upload_scheduled: "var(--plum)",
  completed: "var(--good)",
}

export function groupEventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const out: Record<string, CalendarEvent[]> = {}
  for (const ev of events) {
    const key = ev.event_date
    if (!out[key]) out[key] = []
    out[key].push(ev)
  }
  for (const key of Object.keys(out)) {
    out[key].sort((a, b) => statusPriority(a.status) - statusPriority(b.status))
  }
  return out
}

export function applyFilters(events: CalendarEvent[], f: CalendarFilters): CalendarEvent[] {
  const q = f.query.trim().toLowerCase()
  return events.filter((ev) => {
    if (f.channels.size > 0) {
      const key = ev.channel ?? UNASSIGNED
      if (!f.channels.has(key)) return false
    }
    if (f.statuses.size > 0 && !f.statuses.has(ev.status)) return false
    if (f.assetTypes.size > 0) {
      const key = ev.asset_type ?? UNASSIGNED
      if (!f.assetTypes.has(key)) return false
    }
    if (q && !ev.title.toLowerCase().includes(q)) return false
    return true
  })
}

export function distinctValues(events: CalendarEvent[], key: "channel" | "asset_type"): string[] {
  const set = new Set<string>()
  for (const ev of events) {
    const v = ev[key]
    set.add(v ?? UNASSIGNED)
  }
  return Array.from(set).sort((a, b) => {
    if (a === UNASSIGNED) return 1
    if (b === UNASSIGNED) return -1
    return a.localeCompare(b, "ko")
  })
}

export function getVisibleRange(date: Date, view: ViewMode): { from: Date; to: Date } {
  if (view === "month") {
    return { from: startOfMonth(date), to: endOfMonth(date) }
  }
  if (view === "week") {
    return { from: startOfWeek(date, { weekStartsOn: 0 }), to: endOfWeek(date, { weekStartsOn: 0 }) }
  }
  // list: 전체 로드된 범위. 호출자가 events 기준으로 판단.
  return { from: date, to: date }
}

export function getMonthCells(date: Date): (Date | null)[] {
  const first = startOfMonth(date)
  const daysInMonth = getDaysInMonth(date)
  const leading = getDay(first) // 0=Sun..6=Sat
  const cells: (Date | null)[] = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(date.getFullYear(), date.getMonth(), d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 0 })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function getRelativeDateLabel(date: Date, today: Date): string | null {
  const diff = differenceInCalendarDays(date, today)
  if (diff === 0) return "오늘"
  if (diff === 1) return "내일"
  if (diff === -1) return "어제"
  if (diff > 1 && diff <= 3) return `${diff}일 후`
  if (diff < -1 && diff >= -3) return `${-diff}일 전`
  return null
}

export function isInLoadedRange(date: Date, events: CalendarEvent[]): boolean {
  if (events.length === 0) return true
  let minD = events[0].event_date
  let maxD = events[0].event_date
  for (const ev of events) {
    if (ev.event_date < minD) minD = ev.event_date
    if (ev.event_date > maxD) maxD = ev.event_date
  }
  const min = startOfMonth(parseISO(minD))
  const max = endOfMonth(parseISO(maxD))
  return date >= min && date <= max
}

export function formatDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

export function formatMonthTitle(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
}

export function formatWeekTitle(date: Date): string {
  const start = startOfWeek(date, { weekStartsOn: 0 })
  const end = endOfWeek(date, { weekStartsOn: 0 })
  const weekNum = getISOWeek(date)
  if (isSameMonth(start, end)) {
    return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 – ${end.getDate()}일 (${weekNum}주차)`
  }
  return `${start.getFullYear()}.${start.getMonth() + 1}.${start.getDate()} – ${end.getMonth() + 1}.${end.getDate()} (${weekNum}주차)`
}

export function stepDate(date: Date, view: ViewMode, direction: 1 | -1): Date {
  if (view === "month") return addMonths(date, direction)
  if (view === "week") return addWeeks(date, direction)
  return addMonths(date, direction)
}

// ─── URL serialization ─────────────────────────────────────────
export interface CalendarUrlState {
  view: ViewMode
  date: Date
  filters: CalendarFilters
}

const VIEW_SET: ReadonlySet<ViewMode> = new Set(["month", "week", "list"])

export function parseSearchParams(sp: URLSearchParams, today: Date): CalendarUrlState {
  const rawView = sp.get("view")
  const view: ViewMode = VIEW_SET.has(rawView as ViewMode) ? (rawView as ViewMode) : "month"
  const rawDate = sp.get("date")
  let date = today
  if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const parsed = parseISO(rawDate)
    if (!isNaN(parsed.getTime())) date = parsed
  }
  const toSet = (s: string | null) =>
    new Set(s ? s.split(",").filter(Boolean) : [])
  const filters: CalendarFilters = {
    channels: toSet(sp.get("channels")),
    statuses: toSet(sp.get("statuses")),
    assetTypes: toSet(sp.get("types")),
    query: sp.get("q") ?? "",
  }
  return { view, date, filters }
}

export function buildSearchParams(state: CalendarUrlState): URLSearchParams {
  const sp = new URLSearchParams()
  if (state.view !== "month") sp.set("view", state.view)
  sp.set("date", formatDateKey(state.date))
  if (state.filters.channels.size > 0) sp.set("channels", Array.from(state.filters.channels).join(","))
  if (state.filters.statuses.size > 0) sp.set("statuses", Array.from(state.filters.statuses).join(","))
  if (state.filters.assetTypes.size > 0) sp.set("types", Array.from(state.filters.assetTypes).join(","))
  if (state.filters.query) sp.set("q", state.filters.query)
  return sp
}

export function countActiveFilters(f: CalendarFilters): number {
  let n = 0
  if (f.channels.size > 0) n++
  if (f.statuses.size > 0) n++
  if (f.assetTypes.size > 0) n++
  if (f.query.trim()) n++
  return n
}

export function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}
```

- [ ] **Step 2: 타입체크 확인**

Run: `npx tsc --noEmit`
Expected: 새로운 에러 0. 기존 에러는 무시.

- [ ] **Step 3: 커밋**

```bash
git add src/components/viewer/calendar/lib/calendar-utils.ts
git commit -m "feat(calendar): add pure utils layer for new calendar view"
```

---

## Task 2: `hooks/useCalendarFilters.ts` — URL 동기화 훅

**Files:**
- Create: `src/components/viewer/calendar/hooks/useCalendarFilters.ts`

- [ ] **Step 1: 파일 생성**

```typescript
// src/components/viewer/calendar/hooks/useCalendarFilters.ts
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  buildSearchParams, parseSearchParams,
  type CalendarFilters, type CalendarUrlState, type ViewMode,
} from "../lib/calendar-utils"

export interface UseCalendarFiltersReturn {
  view: ViewMode
  date: Date
  filters: CalendarFilters
  setView: (v: ViewMode) => void
  setDate: (d: Date) => void
  setFilters: (updater: (prev: CalendarFilters) => CalendarFilters) => void
  setQueryInput: (q: string) => void  // debounced → URL
  queryInput: string                  // 비동기화된 로컬 입력값 (input 바인딩용)
  reset: () => void
}

export function useCalendarFilters(today: Date): UseCalendarFiltersReturn {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initial = useMemo<CalendarUrlState>(
    () => parseSearchParams(new URLSearchParams(searchParams?.toString() ?? ""), today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const [view, setViewState] = useState<ViewMode>(initial.view)
  const [date, setDateState] = useState<Date>(initial.date)
  const [filters, setFiltersState] = useState<CalendarFilters>(initial.filters)
  const [queryInput, setQueryInputState] = useState<string>(initial.filters.query)

  const pushUrl = useCallback(
    (next: CalendarUrlState) => {
      const sp = buildSearchParams(next)
      const qs = sp.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname]
  )

  const setView = useCallback((v: ViewMode) => {
    setViewState(v)
    pushUrl({ view: v, date, filters })
  }, [date, filters, pushUrl])

  const setDate = useCallback((d: Date) => {
    setDateState(d)
    pushUrl({ view, date: d, filters })
  }, [view, filters, pushUrl])

  const setFilters = useCallback(
    (updater: (prev: CalendarFilters) => CalendarFilters) => {
      setFiltersState((prev) => {
        const next = updater(prev)
        pushUrl({ view, date, filters: next })
        return next
      })
    },
    [view, date, pushUrl]
  )

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setQueryInput = useCallback((q: string) => {
    setQueryInputState(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFiltersState((prev) => {
        const next = { ...prev, query: q }
        pushUrl({ view, date, filters: next })
        return next
      })
    }, 200)
  }, [view, date, pushUrl])

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const reset = useCallback(() => {
    const empty: CalendarFilters = {
      channels: new Set(), statuses: new Set(), assetTypes: new Set(), query: "",
    }
    setFiltersState(empty)
    setQueryInputState("")
    pushUrl({ view, date, filters: empty })
  }, [view, date, pushUrl])

  return { view, date, filters, setView, setDate, setFilters, setQueryInput, queryInput, reset }
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 새로운 에러 0.

- [ ] **Step 3: 커밋**

```bash
git add src/components/viewer/calendar/hooks/useCalendarFilters.ts
git commit -m "feat(calendar): add URL-synced filters hook"
```

---

## Task 3: `EventPill.tsx` — 뷰 공통 이벤트 한 줄

**Files:**
- Create: `src/components/viewer/calendar/EventPill.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// src/components/viewer/calendar/EventPill.tsx
"use client"

import type { CalendarEvent } from "@/types"
import { STATUS_LABELS } from "@/types"
import type { CalendarEventStatus } from "@/types"
import {
  channelColor, channelTagClass, STATUS_DOT_COLOR,
} from "./lib/calendar-utils"

interface EventPillProps {
  event: CalendarEvent
  selected?: boolean
  showStatusLabel?: boolean  // 리스트 뷰에서 true
  onClick: (ev: CalendarEvent) => void
}

export default function EventPill({ event, selected, showStatusLabel, onClick }: EventPillProps) {
  const statusLabel = STATUS_LABELS[event.status as CalendarEventStatus] ?? event.status
  const statusColor = STATUS_DOT_COLOR[event.status] ?? "var(--dim)"
  const leftBar = selected ? "var(--amber)" : channelColor(event.channel)

  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      aria-label={`${event.channel ?? "미지정"} · ${event.title} · ${statusLabel} · ${event.event_date}`}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 6px 3px 8px",
        borderRadius: 4,
        textAlign: "left",
        position: "relative",
        background: selected ? "var(--bg-2)" : "transparent",
        transition: "background .12s",
        cursor: "pointer",
        fontSize: 11,
      }}
      className="cal-pill"
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 0, top: 2, bottom: 2,
          width: 2,
          borderRadius: 1,
          background: leftBar,
        }}
      />
      {event.channel && (
        <span
          className={channelTagClass(event.channel)}
          style={{ fontSize: 9, padding: "1px 5px", flexShrink: 0 }}
        >
          {event.channel}
        </span>
      )}
      <span
        style={{
          color: "var(--text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          minWidth: 0,
        }}
      >
        {event.title}
      </span>
      {showStatusLabel ? (
        <span style={{ color: "var(--dim)", fontSize: 10, flexShrink: 0 }}>
          · {statusLabel}
        </span>
      ) : (
        <span
          aria-hidden
          style={{
            width: 6, height: 6, borderRadius: "50%",
            background: statusColor, flexShrink: 0,
          }}
        />
      )}
    </button>
  )
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 새로운 에러 0.

- [ ] **Step 3: 커밋**

```bash
git add src/components/viewer/calendar/EventPill.tsx
git commit -m "feat(calendar): add shared EventPill component"
```

---

## Task 4: `DayPopover.tsx` — +N 더보기 팝오버

포털로 `document.body`에 렌더. 외부 클릭/ESC 닫기. 뷰포트 경계 보정.

**Files:**
- Create: `src/components/viewer/calendar/DayPopover.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// src/components/viewer/calendar/DayPopover.tsx
"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import type { CalendarEvent } from "@/types"
import EventPill from "./EventPill"

interface DayPopoverProps {
  anchor: HTMLElement | null
  dayLabel: string         // ex. "2026년 4월 15일 수"
  events: CalendarEvent[]
  selectedEventId: string | null
  onClose: () => void
  onEventClick: (ev: CalendarEvent) => void
}

export default function DayPopover({
  anchor, dayLabel, events, selectedEventId, onClose, onEventClick,
}: DayPopoverProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchor) return
    const r = anchor.getBoundingClientRect()
    const width = 260
    const margin = 8
    let left = r.left
    if (left + width > window.innerWidth - margin) left = r.right - width
    if (left < margin) left = margin
    let top = r.bottom + 4
    const maxHeight = 380
    if (top + maxHeight > window.innerHeight - margin) {
      top = Math.max(margin, r.top - maxHeight - 4)
    }
    setPos({ top: top + window.scrollY, left: left + window.scrollX })
  }, [anchor])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    const onDocClick = (e: MouseEvent) => {
      if (!boxRef.current || !anchor) return
      const t = e.target as Node
      if (!boxRef.current.contains(t) && !anchor.contains(t)) onClose()
    }
    window.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onDocClick)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onDocClick)
    }
  }, [anchor, onClose])

  if (!anchor || !pos) return null

  return createPortal(
    <div
      ref={boxRef}
      role="dialog"
      aria-label={dayLabel}
      style={{
        position: "absolute",
        top: pos.top, left: pos.left,
        width: 260,
        maxHeight: 380,
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        boxShadow: "0 12px 40px #000a",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 12px",
        borderBottom: "1px solid var(--line)",
        fontSize: 11,
      }}>
        <span style={{ color: "var(--text)", flex: 1 }}>{dayLabel}</span>
        <span style={{ color: "var(--dim)" }}>{events.length}건</span>
        <button
          onClick={onClose}
          aria-label="닫기"
          style={{
            display: "grid", placeItems: "center",
            width: 22, height: 22, borderRadius: 4,
            color: "var(--dim)",
          }}
        >
          <X style={{ width: 12, height: 12 }} />
        </button>
      </div>
      <div style={{
        padding: 6, overflowY: "auto", display: "flex",
        flexDirection: "column", gap: 2, flex: 1,
      }}>
        {events.map((ev) => (
          <EventPill
            key={ev.id}
            event={ev}
            selected={ev.id === selectedEventId}
            onClick={onEventClick}
          />
        ))}
      </div>
    </div>,
    document.body
  )
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 새로운 에러 0.

- [ ] **Step 3: 커밋**

```bash
git add src/components/viewer/calendar/DayPopover.tsx
git commit -m "feat(calendar): add +N day popover"
```

---

## Task 5: `EventDrawer.tsx` — 우측 슬라이드 상세

ESC 닫기, 닫기 버튼, 오버레이 없음. `selectedEventId`가 null이 아니면 표시, null이면 슬라이드 아웃.

**Files:**
- Create: `src/components/viewer/calendar/EventDrawer.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// src/components/viewer/calendar/EventDrawer.tsx
"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import type { CalendarEvent, CalendarEventStatus } from "@/types"
import { STATUS_LABELS } from "@/types"
import { parseISO } from "date-fns"
import { channelTagClass, getRelativeDateLabel, STATUS_DOT_COLOR } from "./lib/calendar-utils"

interface EventDrawerProps {
  event: CalendarEvent | null
  today: Date
  onClose: () => void
}

export default function EventDrawer({ event, today, onClose }: EventDrawerProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const open = !!event

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    closeBtnRef.current?.focus()
    return () => window.removeEventListener("keydown", onKey)
  }, [open, event?.id, onClose])

  if (typeof window === "undefined") return null

  return createPortal(
    <aside
      role="dialog"
      aria-label={event?.title ?? "이벤트 상세"}
      className="cal-drawer"
      data-open={open}
      style={{
        position: "fixed",
        top: 0, right: 0, bottom: 0,
        width: 380,
        background: "var(--bg-1)",
        borderLeft: "1px solid var(--line)",
        zIndex: 40,
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform .28s cubic-bezier(.2,.7,.2,1)",
        display: "flex",
        flexDirection: "column",
        boxShadow: open ? "-12px 0 40px #0008" : "none",
      }}
    >
      {event && (
        <>
          <header style={{
            padding: "22px 24px 16px",
            borderBottom: "1px solid var(--line)",
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10,
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: ".12em",
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                {event.channel ? (
                  <span className={channelTagClass(event.channel)} style={{ fontSize: 9 }}>
                    {event.channel}
                  </span>
                ) : (
                  <span style={{ color: "var(--dimmer)" }}>미지정</span>
                )}
              </div>
              <h2 style={{
                fontFamily: "var(--c-serif)",
                fontSize: 22,
                fontWeight: 400,
                letterSpacing: "-.02em",
                lineHeight: 1.2,
                color: "var(--text)",
              }}>{event.title}</h2>
            </div>
            <button
              ref={closeBtnRef}
              onClick={onClose}
              aria-label="닫기"
              style={{
                width: 32, height: 32,
                border: "1px solid var(--line)",
                borderRadius: 7,
                display: "grid",
                placeItems: "center",
                color: "var(--text-2)",
                flexShrink: 0,
              }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </header>

          <div style={{ padding: "22px 24px", overflowY: "auto", flex: 1 }}>
            <MetaGrid event={event} today={today} />
            {event.description && (
              <>
                <SectionHeader>설명</SectionHeader>
                <p style={{
                  fontSize: 12,
                  color: "var(--text-2)",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}>
                  {event.description}
                </p>
              </>
            )}
          </div>
        </>
      )}
    </aside>,
    document.body
  )
}

function MetaGrid({ event, today }: { event: CalendarEvent; today: Date }) {
  const statusLabel = STATUS_LABELS[event.status as CalendarEventStatus] ?? event.status
  const statusColor = STATUS_DOT_COLOR[event.status] ?? "var(--dim)"
  const eventDate = parseISO(event.event_date)
  const rel = getRelativeDateLabel(eventDate, today)

  const rows: Array<[string, React.ReactNode]> = [
    ["상태", (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span aria-hidden style={{
          width: 8, height: 8, borderRadius: "50%", background: statusColor,
        }} />
        <span>{statusLabel}</span>
      </span>
    )],
    ["날짜", (
      <span>
        {event.event_date}
        {rel && (
          <span style={{ color: "var(--amber)", marginLeft: 8, fontSize: 11 }}>· {rel}</span>
        )}
      </span>
    )],
    ["채널", event.channel ?? <span style={{ color: "var(--dimmer)" }}>미지정</span>],
    ["소재 유형", event.asset_type ?? <span style={{ color: "var(--dimmer)" }}>미지정</span>],
  ]

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "72px 1fr",
      rowGap: 12,
      columnGap: 16,
      alignItems: "baseline",
      fontSize: 12,
    }}>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: "contents" }}>
          <span style={{
            fontSize: 10,
            color: "var(--dim)",
            textTransform: "uppercase",
            letterSpacing: ".1em",
            paddingTop: 2,
          }}>{label}</span>
          <span style={{ color: "var(--text)" }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 style={{
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: ".14em",
      color: "var(--dim)",
      margin: "24px 0 10px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontWeight: 500,
    }}>
      <span>{children}</span>
      <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
    </h4>
  )
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 새로운 에러 0.

- [ ] **Step 3: 커밋**

```bash
git add src/components/viewer/calendar/EventDrawer.tsx
git commit -m "feat(calendar): add slide-in event detail drawer"
```

---

## Task 6: `CalendarFilters.tsx` — chip 필터 바 + 검색

**Files:**
- Create: `src/components/viewer/calendar/CalendarFilters.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// src/components/viewer/calendar/CalendarFilters.tsx
"use client"

import { Search } from "lucide-react"
import { STATUS_LABELS } from "@/types"
import type { CalendarEventStatus } from "@/types"
import {
  countActiveFilters, toggleInSet, UNASSIGNED,
  type CalendarFilters,
} from "./lib/calendar-utils"

const STATUS_ORDER: CalendarEventStatus[] = [
  "draft", "review_requested", "feedback_pending",
  "in_revision", "upload_scheduled", "completed",
]

interface CalendarFiltersProps {
  filters: CalendarFilters
  channelOptions: string[]
  statusOptions: string[]
  assetTypeOptions: string[]
  queryInput: string
  onToggleChannel: (v: string) => void
  onToggleStatus: (v: string) => void
  onToggleAssetType: (v: string) => void
  onQueryInputChange: (q: string) => void
  onReset: () => void
}

export default function CalendarFilters({
  filters,
  channelOptions, statusOptions, assetTypeOptions,
  queryInput,
  onToggleChannel, onToggleStatus, onToggleAssetType,
  onQueryInputChange, onReset,
}: CalendarFiltersProps) {
  const activeCount = countActiveFilters(filters)

  const sortedStatuses = STATUS_ORDER.filter((s) => statusOptions.includes(s))

  return (
    <div className="cal-filters" style={{
      display: "flex",
      flexDirection: "column",
      gap: 10,
      padding: "12px 16px",
      background: "var(--bg-1)",
      border: "1px solid var(--line)",
      borderRadius: 8,
    }}>
      {channelOptions.length > 0 && (
        <FilterRow label="채널">
          {channelOptions.map((v) => (
            <Chip
              key={v}
              label={v === UNASSIGNED ? "미지정" : v}
              active={filters.channels.has(v)}
              onClick={() => onToggleChannel(v)}
            />
          ))}
        </FilterRow>
      )}

      {sortedStatuses.length > 0 && (
        <FilterRow label="상태">
          {sortedStatuses.map((s) => (
            <Chip
              key={s}
              label={STATUS_LABELS[s]}
              active={filters.statuses.has(s)}
              onClick={() => onToggleStatus(s)}
            />
          ))}
        </FilterRow>
      )}

      {assetTypeOptions.length > 0 && (
        <FilterRow label="소재">
          {assetTypeOptions.map((v) => (
            <Chip
              key={v}
              label={v === UNASSIGNED ? "미지정" : v}
              active={filters.assetTypes.has(v)}
              onClick={() => onToggleAssetType(v)}
            />
          ))}
        </FilterRow>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          border: "1px solid var(--line)",
          background: "var(--bg-2)",
          borderRadius: 6,
          fontSize: 12,
        }}>
          <Search style={{ width: 13, height: 13, color: "var(--dim)" }} />
          <input
            type="text"
            value={queryInput}
            onChange={(e) => onQueryInputChange(e.target.value)}
            placeholder="제목 검색"
            style={{
              flex: 1,
              background: "transparent",
              border: 0,
              color: "var(--text)",
              outline: "none",
              font: "inherit",
              fontSize: 12,
            }}
          />
          {queryInput && (
            <button
              onClick={() => onQueryInputChange("")}
              aria-label="검색어 지우기"
              style={{ color: "var(--dim)", fontSize: 10 }}
            >
              ×
            </button>
          )}
        </div>
        <button
          className="btn"
          onClick={onReset}
          disabled={activeCount === 0}
          style={{
            opacity: activeCount === 0 ? 0.45 : 1,
            cursor: activeCount === 0 ? "default" : "pointer",
          }}
        >
          필터 초기화 {activeCount > 0 ? `(${activeCount})` : ""}
        </button>
      </div>
    </div>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span className="fg-label" style={{
        fontSize: 10,
        color: "var(--dim)",
        textTransform: "uppercase",
        letterSpacing: ".12em",
        minWidth: 32,
      }}>{label}</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{children}</div>
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={active ? "chip on" : "chip"}
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 새로운 에러 0.

- [ ] **Step 3: 커밋**

```bash
git add src/components/viewer/calendar/CalendarFilters.tsx
git commit -m "feat(calendar): add filters bar with chip + search"
```

---

## Task 7: `CalendarHeader.tsx` — 월 네비 + 오늘 + 뷰 토글

**Files:**
- Create: `src/components/viewer/calendar/CalendarHeader.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// src/components/viewer/calendar/CalendarHeader.tsx
"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  formatMonthTitle, formatWeekTitle,
  type ViewMode,
} from "./lib/calendar-utils"

interface CalendarHeaderProps {
  view: ViewMode
  currentDate: Date
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onChangeView: (v: ViewMode) => void
}

export default function CalendarHeader({
  view, currentDate, onPrev, onNext, onToday, onChangeView,
}: CalendarHeaderProps) {
  const title =
    view === "month" ? formatMonthTitle(currentDate)
    : view === "week" ? formatWeekTitle(currentDate)
    : formatMonthTitle(currentDate) + " 기준"

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "4px 0",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <IconBtn onClick={onPrev} label="이전">
          <ChevronLeft style={{ width: 14, height: 14 }} />
        </IconBtn>
        <IconBtn onClick={onNext} label="다음">
          <ChevronRight style={{ width: 14, height: 14 }} />
        </IconBtn>
      </div>

      <h2 style={{
        fontFamily: "var(--c-serif)",
        fontSize: 22,
        fontWeight: 400,
        letterSpacing: "-.015em",
        color: "var(--text)",
        margin: 0,
      }}>{title}</h2>

      <button className="btn" onClick={onToday}>오늘</button>

      <div style={{ marginLeft: "auto" }}>
        <ViewToggle view={view} onChange={onChangeView} />
      </div>
    </div>
  )
}

function IconBtn({
  onClick, label, children,
}: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        width: 28, height: 28,
        border: "1px solid var(--line)",
        borderRadius: 6,
        display: "grid",
        placeItems: "center",
        background: "var(--bg-1)",
        color: "var(--text-2)",
      }}
    >{children}</button>
  )
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const items: Array<{ k: ViewMode; label: string }> = [
    { k: "month", label: "월" },
    { k: "week", label: "주" },
    { k: "list", label: "리스트" },
  ]
  return (
    <div style={{
      display: "flex",
      gap: 2,
      background: "var(--bg-2)",
      padding: 2,
      border: "1px solid var(--line)",
      borderRadius: 6,
    }}>
      {items.map(({ k, label }) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          aria-pressed={view === k}
          style={{
            padding: "4px 12px",
            fontSize: 11,
            borderRadius: 4,
            color: view === k ? "var(--text)" : "var(--dim)",
            background: view === k ? "var(--bg-3)" : "transparent",
            letterSpacing: ".04em",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 새로운 에러 0.

- [ ] **Step 3: 커밋**

```bash
git add src/components/viewer/calendar/CalendarHeader.tsx
git commit -m "feat(calendar): add header with month nav and view toggle"
```

---

## Task 8: `views/MonthView.tsx`

**Files:**
- Create: `src/components/viewer/calendar/views/MonthView.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// src/components/viewer/calendar/views/MonthView.tsx
"use client"

import { useMemo, useRef, useState } from "react"
import { isSameMonth, isToday as dfIsToday } from "date-fns"
import type { CalendarEvent } from "@/types"
import EventPill from "../EventPill"
import DayPopover from "../DayPopover"
import {
  formatDateKey, getMonthCells, groupEventsByDate,
} from "../lib/calendar-utils"

const WEEKDAYS: Array<{ label: string; color?: string }> = [
  { label: "일", color: "var(--bad)" },
  { label: "월" },
  { label: "화" },
  { label: "수" },
  { label: "목" },
  { label: "금" },
  { label: "토", color: "var(--steel)" },
]

const MAX_PILLS = 3

interface MonthViewProps {
  currentDate: Date
  events: CalendarEvent[]
  selectedEventId: string | null
  onEventClick: (ev: CalendarEvent) => void
}

export default function MonthView({
  currentDate, events, selectedEventId, onEventClick,
}: MonthViewProps) {
  const cells = useMemo(() => getMonthCells(currentDate), [currentDate])
  const byDate = useMemo(() => groupEventsByDate(events), [events])
  const today = useMemo(() => new Date(), [])

  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [overflowKey, setOverflowKey] = useState<string | null>(null)

  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <div style={{
      background: "var(--bg-1)",
      border: "1px solid var(--line)",
      borderRadius: 10,
      overflow: "hidden",
    }}>
      {/* 요일 헤더 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        borderBottom: "1px solid var(--line)",
      }}>
        {WEEKDAYS.map((w) => (
          <div key={w.label} style={{
            padding: "10px 0",
            textAlign: "center",
            fontSize: 10,
            letterSpacing: ".12em",
            color: w.color ?? "var(--dim)",
          }}>{w.label}</div>
        ))}
      </div>

      {/* 주 행 */}
      {weeks.map((week, wi) => (
        <div key={wi} style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          borderBottom: wi === weeks.length - 1 ? 0 : "1px solid var(--line)",
        }}>
          {week.map((day, di) => {
            const inMonth = day ? isSameMonth(day, currentDate) : false
            const isTodayCell = !!day && dfIsToday(day)
            const key = day ? formatDateKey(day) : `empty-${wi}-${di}`
            const dayEvents = day ? byDate[formatDateKey(day)] ?? [] : []
            const overflow = dayEvents.length - MAX_PILLS
            const numberColor =
              !inMonth ? "var(--dimmer)"
              : isTodayCell ? "var(--amber)"
              : di === 0 ? "var(--bad)"
              : di === 6 ? "var(--steel)"
              : "var(--text-2)"

            return (
              <div
                key={key}
                ref={(el) => { cellRefs.current[key] = el }}
                style={{
                  minHeight: 110,
                  padding: "6px 6px 8px",
                  position: "relative",
                  background: isTodayCell ? "color-mix(in srgb, var(--amber) 6%, transparent)" : "transparent",
                  borderRight: di === 6 ? 0 : "1px solid var(--line)",
                  transition: "background .12s",
                }}
                aria-current={isTodayCell ? "date" : undefined}
              >
                {isTodayCell && (
                  <span aria-hidden style={{
                    position: "absolute",
                    top: 0, left: 0,
                    width: 20, height: 2,
                    background: "var(--amber)",
                    borderRadius: "0 0 1px 0",
                  }} />
                )}
                {day && (
                  <>
                    <div style={{
                      fontFamily: "var(--c-mono)",
                      fontSize: 11,
                      color: numberColor,
                      fontWeight: isTodayCell ? 600 : 400,
                      marginBottom: 4,
                      paddingLeft: 2,
                    }}>
                      {day.getDate()}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {dayEvents.slice(0, MAX_PILLS).map((ev) => (
                        <EventPill
                          key={ev.id}
                          event={ev}
                          selected={ev.id === selectedEventId}
                          onClick={onEventClick}
                        />
                      ))}
                      {overflow > 0 && (
                        <button
                          type="button"
                          onClick={() => setOverflowKey(key)}
                          style={{
                            fontSize: 10,
                            color: "var(--dim)",
                            textAlign: "left",
                            padding: "2px 6px",
                          }}
                        >
                          +{overflow} 더보기
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {overflowKey && byDate[overflowKey] && (() => {
        const popDate = new Date(overflowKey)
        const wd = ["일","월","화","수","목","금","토"][popDate.getDay()]
        const pretty = `${popDate.getFullYear()}년 ${popDate.getMonth() + 1}월 ${popDate.getDate()}일 ${wd}`
        return (
          <DayPopover
            anchor={cellRefs.current[overflowKey]}
            dayLabel={pretty}
            events={byDate[overflowKey]}
            selectedEventId={selectedEventId}
            onClose={() => setOverflowKey(null)}
            onEventClick={(ev) => {
              onEventClick(ev)
            }}
          />
        )
      })()}
    </div>
  )
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 새로운 에러 0.

- [ ] **Step 3: 커밋**

```bash
git add src/components/viewer/calendar/views/MonthView.tsx
git commit -m "feat(calendar): add month view with overflow popover"
```

---

## Task 9: `views/WeekView.tsx`

**Files:**
- Create: `src/components/viewer/calendar/views/WeekView.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// src/components/viewer/calendar/views/WeekView.tsx
"use client"

import { useMemo } from "react"
import { isToday as dfIsToday } from "date-fns"
import type { CalendarEvent } from "@/types"
import EventPill from "../EventPill"
import {
  formatDateKey, getWeekDays, groupEventsByDate,
} from "../lib/calendar-utils"

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]

interface WeekViewProps {
  currentDate: Date
  events: CalendarEvent[]
  selectedEventId: string | null
  onEventClick: (ev: CalendarEvent) => void
}

export default function WeekView({
  currentDate, events, selectedEventId, onEventClick,
}: WeekViewProps) {
  const days = useMemo(() => getWeekDays(currentDate), [currentDate])
  const byDate = useMemo(() => groupEventsByDate(events), [events])

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      background: "var(--bg-1)",
      border: "1px solid var(--line)",
      borderRadius: 10,
      overflow: "hidden",
    }}>
      {days.map((day, di) => {
        const key = formatDateKey(day)
        const dayEvents = byDate[key] ?? []
        const isTodayCell = dfIsToday(day)
        const labelColor =
          isTodayCell ? "var(--amber)"
          : di === 0 ? "var(--bad)"
          : di === 6 ? "var(--steel)"
          : "var(--text-2)"

        return (
          <div
            key={key}
            aria-current={isTodayCell ? "date" : undefined}
            style={{
              minHeight: 400,
              padding: 10,
              borderRight: di === 6 ? 0 : "1px solid var(--line)",
              background: isTodayCell ? "color-mix(in srgb, var(--amber) 5%, transparent)" : "transparent",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minWidth: 0,
            }}
          >
            <header style={{
              display: "flex",
              alignItems: "baseline",
              gap: 6,
              paddingBottom: 6,
              borderBottom: "1px solid var(--line)",
            }}>
              <span style={{
                fontSize: 10,
                letterSpacing: ".12em",
                color: labelColor,
              }}>{WEEKDAY_LABELS[di]}</span>
              <span style={{
                fontFamily: "var(--c-mono)",
                fontSize: 14,
                color: labelColor,
                fontWeight: isTodayCell ? 600 : 400,
              }}>{day.getDate()}</span>
              {dayEvents.length > 0 && (
                <span style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  color: "var(--dim)",
                }}>{dayEvents.length}건</span>
              )}
            </header>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              flex: 1,
              minWidth: 0,
            }}>
              {dayEvents.length === 0 ? (
                <div style={{
                  fontSize: 10,
                  color: "var(--dimmer)",
                  textAlign: "center",
                  paddingTop: 24,
                }}>— 일정 없음</div>
              ) : (
                dayEvents.map((ev) => (
                  <EventPill
                    key={ev.id}
                    event={ev}
                    selected={ev.id === selectedEventId}
                    onClick={onEventClick}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 새로운 에러 0.

- [ ] **Step 3: 커밋**

```bash
git add src/components/viewer/calendar/views/WeekView.tsx
git commit -m "feat(calendar): add week view as 7-column list"
```

---

## Task 10: `views/ListView.tsx`

**Files:**
- Create: `src/components/viewer/calendar/views/ListView.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// src/components/viewer/calendar/views/ListView.tsx
"use client"

import { useEffect, useMemo, useRef } from "react"
import { getDay, parseISO } from "date-fns"
import type { CalendarEvent } from "@/types"
import EventPill from "../EventPill"
import {
  formatDateKey, getRelativeDateLabel, groupEventsByDate,
} from "../lib/calendar-utils"

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

interface ListViewProps {
  events: CalendarEvent[]
  selectedEventId: string | null
  onEventClick: (ev: CalendarEvent) => void
}

export default function ListView({
  events, selectedEventId, onEventClick,
}: ListViewProps) {
  const byDate = useMemo(() => groupEventsByDate(events), [events])
  const sortedKeys = useMemo(() => Object.keys(byDate).sort(), [byDate])
  const today = useMemo(() => new Date(), [])
  const todayKey = formatDateKey(today)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!rootRef.current) return
    const el = rootRef.current.querySelector<HTMLElement>(`[data-key="${todayKey}"]`)
      ?? rootRef.current.querySelector<HTMLElement>(`[data-future="1"]`)
    el?.scrollIntoView({ block: "start" })
  }, [todayKey])

  if (sortedKeys.length === 0) {
    return (
      <div style={{
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: 40,
        textAlign: "center",
        color: "var(--dim)",
        fontSize: 12,
      }}>조건에 맞는 일정이 없습니다.</div>
    )
  }

  return (
    <div
      ref={rootRef}
      style={{
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {sortedKeys.map((key) => {
        const d = parseISO(key)
        const dayEvents = byDate[key]
        const isTodayGroup = key === todayKey
        const isFutureGroup = key >= todayKey
        const rel = getRelativeDateLabel(d, today)
        const weekday = WEEKDAYS[getDay(d)]

        return (
          <section
            key={key}
            data-key={key}
            data-future={isFutureGroup ? "1" : "0"}
            style={{
              borderBottom: "1px solid var(--line)",
              borderLeft: isTodayGroup ? "2px solid var(--amber)" : "2px solid transparent",
              background: isTodayGroup ? "color-mix(in srgb, var(--amber) 4%, transparent)" : "transparent",
            }}
          >
            <header style={{
              padding: "10px 16px",
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              fontSize: 11,
              color: "var(--text-2)",
              background: "color-mix(in srgb, var(--bg-2) 60%, transparent)",
              borderBottom: "1px solid var(--line)",
            }}>
              {rel && (
                <span style={{
                  color: isTodayGroup ? "var(--amber)" : "var(--text)",
                  fontWeight: 500,
                }}>{rel}</span>
              )}
              <span style={{ color: "var(--text-2)" }}>
                {key} ({weekday})
              </span>
              <span style={{ color: "var(--dim)", marginLeft: "auto", fontSize: 10 }}>
                {dayEvents.length}건
              </span>
            </header>
            <div style={{
              padding: "6px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}>
              {dayEvents.map((ev) => (
                <EventPill
                  key={ev.id}
                  event={ev}
                  selected={ev.id === selectedEventId}
                  showStatusLabel
                  onClick={onEventClick}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 새로운 에러 0.

- [ ] **Step 3: 커밋**

```bash
git add src/components/viewer/calendar/views/ListView.tsx
git commit -m "feat(calendar): add list (agenda) view with date grouping"
```

---

## Task 11: `CalendarView.tsx` — 오케스트레이터

**Files:**
- Create: `src/components/viewer/calendar/CalendarView.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// src/components/viewer/calendar/CalendarView.tsx
"use client"

import { useMemo, useState } from "react"
import { isSameMonth, parseISO } from "date-fns"
import type { CalendarEvent } from "@/types"

import CalendarHeader from "./CalendarHeader"
import CalendarFilters from "./CalendarFilters"
import MonthView from "./views/MonthView"
import WeekView from "./views/WeekView"
import ListView from "./views/ListView"
import EventDrawer from "./EventDrawer"
import { useCalendarFilters } from "./hooks/useCalendarFilters"
import {
  applyFilters, distinctValues, stepDate, toggleInSet,
  isInLoadedRange,
} from "./lib/calendar-utils"

interface CalendarViewProps {
  events: CalendarEvent[]
}

export default function CalendarView({ events }: CalendarViewProps) {
  const today = useMemo(() => new Date(), [])
  const {
    view, date, filters, queryInput,
    setView, setDate, setFilters, setQueryInput, reset,
  } = useCalendarFilters(today)

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const filtered = useMemo(() => applyFilters(events, filters), [events, filters])

  const channelOptions = useMemo(() => distinctValues(events, "channel"), [events])
  const statusOptions = useMemo(
    () => Array.from(new Set(events.map((e) => e.status))),
    [events]
  )
  const assetTypeOptions = useMemo(() => distinctValues(events, "asset_type"), [events])

  const selectedEvent =
    selectedEventId ? events.find((e) => e.id === selectedEventId) ?? null : null

  const outOfRange = !isInLoadedRange(date, events) && events.length > 0

  const handleEventClick = (ev: CalendarEvent) => {
    setSelectedEventId((prev) => (prev === ev.id ? null : ev.id))
  }

  const handlePrev = () => setDate(stepDate(date, view, -1))
  const handleNext = () => setDate(stepDate(date, view, 1))
  const handleToday = () => setDate(today)

  const visibleCount = filtered.length
  const totalCount = events.length

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
      }}>
        <CalendarHeader
          view={view}
          currentDate={date}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onChangeView={setView}
        />
      </div>

      <div style={{ fontSize: 11, color: "var(--dim)" }}>
        {visibleCount === totalCount
          ? `${totalCount}건`
          : `${visibleCount}건 / 전체 ${totalCount}건 중`}
      </div>

      <CalendarFilters
        filters={filters}
        channelOptions={channelOptions}
        statusOptions={statusOptions}
        assetTypeOptions={assetTypeOptions}
        queryInput={queryInput}
        onToggleChannel={(v) => setFilters((p) => ({ ...p, channels: toggleInSet(p.channels, v) }))}
        onToggleStatus={(v) => setFilters((p) => ({ ...p, statuses: toggleInSet(p.statuses, v) }))}
        onToggleAssetType={(v) => setFilters((p) => ({ ...p, assetTypes: toggleInSet(p.assetTypes, v) }))}
        onQueryInputChange={setQueryInput}
        onReset={reset}
      />

      {outOfRange && (
        <div style={{
          padding: "10px 14px",
          background: "color-mix(in srgb, var(--amber) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--amber) 30%, var(--line))",
          borderRadius: 6,
          fontSize: 11,
          color: "var(--amber)",
        }}>
          표시된 기간은 로드된 데이터 범위 밖입니다. 일정이 비어 보일 수 있습니다.
        </div>
      )}

      {view === "month" && (
        <MonthView
          currentDate={date}
          events={filtered}
          selectedEventId={selectedEventId}
          onEventClick={handleEventClick}
        />
      )}
      {view === "week" && (
        <WeekView
          currentDate={date}
          events={filtered}
          selectedEventId={selectedEventId}
          onEventClick={handleEventClick}
        />
      )}
      {view === "list" && (
        <ListView
          events={filtered}
          selectedEventId={selectedEventId}
          onEventClick={handleEventClick}
        />
      )}

      <EventDrawer
        event={selectedEvent}
        today={today}
        onClose={() => setSelectedEventId(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 새로운 에러 0.

- [ ] **Step 3: 커밋**

```bash
git add src/components/viewer/calendar/CalendarView.tsx
git commit -m "feat(calendar): wire up orchestrator with views, filters, drawer"
```

---

## Task 12: CSS 추가 — chip hover, pill hover, 반응형

기존 `.chip` / `.btn` / `.panel` 등은 재사용하되, 캘린더 전용 hover와 모바일 반응형 규칙만 추가.

**Files:**
- Modify: `src/styles/console.css` (파일 끝에 섹션 추가)

- [ ] **Step 1: 아래 블록을 `src/styles/console.css` 파일 **맨 끝**에 추가**

```css

/* ── Calendar (viewer/calendar) ───────────────────────────────── */
.console-scope .cal-pill:hover{background:var(--bg-2)}
.console-scope .cal-pill:focus-visible{outline:1px solid var(--amber);outline-offset:1px}

@media(max-width:1279px){
  .console-scope .cal-drawer{width:320px !important}
}
@media(max-width:899px){
  .console-scope .cal-drawer{width:100% !important}
  .console-scope .cal-filters .fg-label{display:none}
}
```

- [ ] **Step 2: dev 서버 기동 확인 (수동)**

Run: `npm run dev`
Expected: 기동 성공. 브라우저에서 `/dashboard/calendar` 접근 시 기존 캘린더가 여전히 동작 (Task 13 전이라 새 컴포넌트는 아직 연결 안 됨).

- [ ] **Step 3: 커밋**

```bash
git add src/styles/console.css
git commit -m "style(calendar): add pill hover and responsive rules"
```

---

## Task 13: 호출부 연결 + 기존 파일 삭제

**Files:**
- Modify: `src/app/dashboard/calendar/page.tsx` (1줄)
- Modify: `src/app/admin/viewer/[brandId]/calendar/page.tsx` (1줄)
- Delete: `src/components/viewer/CalendarView.tsx`

- [ ] **Step 1: `src/app/dashboard/calendar/page.tsx` 수정**

Old (line 4):
```typescript
import CalendarView from "@/components/viewer/CalendarView"
```

New:
```typescript
import CalendarView from "@/components/viewer/calendar/CalendarView"
```

- [ ] **Step 2: `src/app/admin/viewer/[brandId]/calendar/page.tsx` 수정**

Old (line 2):
```typescript
import CalendarView from "@/components/viewer/CalendarView"
```

New:
```typescript
import CalendarView from "@/components/viewer/calendar/CalendarView"
```

또한 이 파일은 `h1 "운영 캘린더"` 타이틀을 인라인으로 쓰고 있는데, `max-width: 960` 제한이 드로어와 충돌. 아래로 교체:

Old (전체):
```tsx
return (
    <div className="canvas" style={{ maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{
        fontFamily: 'var(--c-serif)', fontSize: 20, fontWeight: 700,
        color: 'var(--text)', margin: '0 0 24px',
      }}>
        운영 캘린더
      </h1>
      <CalendarView events={events ?? []} />
    </div>
  )
```

New:
```tsx
return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1>운영 <em>캘린더</em></h1>
          <div className="sub">
            {(events ?? []).length}건 &nbsp; · &nbsp; {from} — {to}
          </div>
        </div>
      </div>
      <CalendarView events={events ?? []} />
    </div>
  )
```

- [ ] **Step 3: 기존 컴포넌트 삭제**

Run:
```bash
rm src/components/viewer/CalendarView.tsx
```

- [ ] **Step 4: 타입체크 및 lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 새로운 에러 0. `@/components/viewer/CalendarView`를 참조하는 미해결 import가 없어야 함.

- [ ] **Step 5: 커밋**

```bash
git add src/app/dashboard/calendar/page.tsx src/app/admin/viewer/[brandId]/calendar/page.tsx src/components/viewer/CalendarView.tsx
git commit -m "feat(calendar): switch callers to new CalendarView module, remove legacy"
```

---

## Task 14: 빌드 + 브라우저 육안 확인

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 프로덕션 빌드 검증**

Run: `npm run build`
Expected: 빌드 성공, 에러 0, 경고 새로 생긴 것 없음.

- [ ] **Step 2: dev 서버 기동**

Run: `npm run dev`
Expected: 기동 성공.

- [ ] **Step 3: `/dashboard/calendar` 수동 검증 체크리스트**

로그인 후 해당 URL 접근. 아래 항목을 한 번씩 눌러보고 결과 확인:

- 월 뷰가 콘솔 다크 테마로 렌더링됨 (흰 배경 아님)
- 오늘 날짜가 amber 색 숫자 + 좌상단 액센트로 강조됨
- 이벤트 Pill에 채널 태그 색이 표시됨
- 이벤트 클릭 → 우측에서 드로어 슬라이드 인
- 드로어 `X` / `ESC` / 같은 이벤트 재클릭으로 닫힘
- 다른 이벤트 클릭 → 드로어 내용만 교체
- 채널 chip 토글 → 이벤트 필터링됨, URL에 `?channels=...` 추가됨
- 상태 chip 토글 → 마찬가지
- 검색박스에 2글자 이상 입력 → 200ms 뒤 URL에 `q=...` 반영
- "필터 초기화" 버튼 → 모두 초기화, URL도 정리됨
- 뷰 토글 월/주/리스트 전환 → 레이아웃 바뀜, URL에 `view=` 반영
- 월 네비 `< >` → 월이 바뀜
- "오늘" 버튼 → 오늘 월로 돌아감
- +N 더보기가 있는 날 클릭 → 팝오버 열림, ESC로 닫힘
- 리스트 뷰 진입 시 오늘 그룹으로 스크롤됨, 오늘 그룹 좌측 amber 바
- 브라우저 새로고침 → URL 상태로부터 뷰/필터 복원됨
- URL 직접 편집 (`?view=week&channels=Meta`) → 해당 상태로 진입

- [ ] **Step 4: `/admin/viewer/[어떤 brandId]/calendar` 수동 검증**

같은 체크리스트 반복 + `page-head`가 추가된 타이틀("운영 캘린더 · XX건 · from — to")이 잘 보이는지 확인.

- [ ] **Step 5: 모바일 뷰포트 확인 (DevTools)**

375x812 또는 390x844로 설정하고 `/dashboard/calendar` 확인:
- 필터 바의 `채널/상태/소재` 라벨이 숨겨짐
- 드로어가 전체 폭으로 열림
- 캘린더 스크롤 가능

- [ ] **Step 6: 최종 커밋 (없으면 생략)**

만약 검증 중 버그를 발견해 수정했다면:
```bash
git add -A
git commit -m "fix(calendar): <발견한 문제 요약>"
```

버그 없으면 이 태스크는 커밋 없이 끝.

---

## Self-Review 체크리스트 (구현 전 참고)

- [ ] 모든 새 파일이 `"use client"` 지시어 필요 (Task 1 `calendar-utils.ts`는 순수 TS라 불필요, 나머지는 React 훅/상태 사용)
- [ ] `date-fns` import는 개별 함수 단위로 (treeshaking)
- [ ] `useMemo`/`useCallback`은 props 전달·그룹핑·필터링에만, 과용 금지
- [ ] `Set<string>` 직접 비교하지 말 것 (참조 비교), 필요하면 `Array.from()` 비교
- [ ] 드로어/팝오버 포털은 SSR에서 `document` 없음 → `"use client"` 컴포넌트에만 있으니 OK
- [ ] URL 쿼리 직렬화 시 빈 값은 키 생략 (`parseSearchParams`가 graceful fallback)
- [ ] 이벤트가 0개인 경우 distinctValues가 빈 배열 → 필터 바 섹션 자체 숨김 (이미 처리됨)
- [ ] 파일 경로는 정확히 `src/components/viewer/calendar/...` 구조 유지

## 스펙 커버리지 확인

| 스펙 요구사항 | 구현 위치 |
|---|---|
| 월/주/리스트 3종 뷰 | Task 8/9/10 + CalendarHeader ViewToggle |
| 채널+상태+소재+검색 4축 필터 | Task 6 CalendarFilters |
| chip OR 조합, 축 간 AND | Task 1 applyFilters |
| +N 팝오버 | Task 4 DayPopover + Task 8 MonthView |
| 우측 슬라이드 드로어 | Task 5 EventDrawer |
| 데이터 3개월 고정, 범위 밖 배너 | Task 11 CalendarView outOfRange |
| URL 쿼리 동기화 | Task 2 useCalendarFilters |
| 요일 한글 | Task 8/9/10 WEEKDAY 상수 |
| 콘솔 다크 테마 토큰 | 전 태스크 inline style + Task 12 추가 CSS |
| EventPill 공통 | Task 3 |
| 상태 우선순위 정렬 | Task 1 statusPriority, Task 1 groupEventsByDate |
| 이동 시 상태 보존 | Task 11 currentDate/filters/selectedEventId 별도 상태 |
| 색약 대비 (드로어/리스트 텍스트 병기) | Task 3 showStatusLabel, Task 5 MetaGrid |
| 반응형 (≥1280 / 900~1279 / ≤899) | Task 12 CSS |
| a11y 기본: ESC, aria-pressed, aria-current | Task 3/4/5/6 각각 |
| 읽기 전용 | 편집 기능 미포함 (확인: 전 태스크) |
