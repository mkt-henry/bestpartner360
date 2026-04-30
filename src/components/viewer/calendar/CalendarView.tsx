// src/components/viewer/calendar/CalendarView.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import type { CalendarEvent } from "@/types"

import CalendarHeader from "./CalendarHeader"
import CalendarFilters from "./CalendarFilters"
import MonthView from "./views/MonthView"
import WeekView from "./views/WeekView"
import ListView from "./views/ListView"
import EventDrawer from "./EventDrawer"
import { useCalendarFilters } from "./hooks/useCalendarFilters"
import {
  applyFilters, distinctValues, distinctLabels, stepDate, toggleInSet,
  isInLoadedRange,
} from "./lib/calendar-utils"
import { type PillPrefix } from "./EventPill"

const PILL_PREFIX_OPTIONS: { value: PillPrefix; label: string }[] = [
  { value: "status", label: "상태" },
  { value: "channel", label: "채널" },
  { value: "both", label: "둘 다" },
  { value: "none", label: "없음" },
]

const LS_PILL_PREFIX = "bp360-cal-pill-prefix"

interface CalendarViewProps {
  events: CalendarEvent[]
  editable?: boolean
  onDayClick?: (dateKey: string) => void
  onEventEdit?: (event: CalendarEvent) => void
  currentUserId?: string
  currentUserRole?: string
}

export default function CalendarView({
  events, editable = false, onDayClick, onEventEdit, currentUserId, currentUserRole,
}: CalendarViewProps) {
  const today = useMemo(() => new Date(), [])
  const {
    view, date, filters, queryInput,
    setView, setDate, setFilters, setQueryInput, reset,
  } = useCalendarFilters(today)

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [pillPrefix, setPillPrefix] = useState<PillPrefix>("status")

  useEffect(() => {
    const saved = localStorage.getItem(LS_PILL_PREFIX) as PillPrefix | null
    if (saved && PILL_PREFIX_OPTIONS.some((o) => o.value === saved)) {
      setPillPrefix(saved)
    }
  }, [])

  function changePillPrefix(v: PillPrefix) {
    setPillPrefix(v)
    localStorage.setItem(LS_PILL_PREFIX, v)
  }

  const isAdmin = currentUserRole === "admin"

  const filtered = useMemo(() => applyFilters(events, filters), [events, filters])

  const channelOptions = useMemo(() => distinctValues(events, "channel"), [events])
  const statusOptions = useMemo(
    () => Array.from(new Set(events.map((e) => e.status))),
    [events]
  )
  const assetTypeOptions = useMemo(() => distinctValues(events, "asset_type"), [events])
  const labelOptions = useMemo(() => distinctLabels(events), [events])

  const selectedEvent =
    !editable && selectedEventId ? events.find((e) => e.id === selectedEventId) ?? null : null

  const outOfRange = !isInLoadedRange(date, events) && events.length > 0

  const handleEventClick = (ev: CalendarEvent) => {
    if (editable) {
      onEventEdit?.(ev)
      return
    }
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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: 11, color: "var(--dim)" }}>
          {visibleCount === totalCount
            ? `${totalCount}건`
            : `${visibleCount}건 / 전체 ${totalCount}건 중`}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--dim)" }}>표시</span>
          <div style={{
            display: "flex",
            border: "1px solid var(--line)",
            borderRadius: 6,
            overflow: "hidden",
          }}>
            {PILL_PREFIX_OPTIONS.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => changePillPrefix(opt.value)}
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  background: pillPrefix === opt.value ? "var(--bg-3)" : "transparent",
                  color: pillPrefix === opt.value ? "var(--text)" : "var(--dim)",
                  fontWeight: pillPrefix === opt.value ? 500 : 400,
                  borderRight: i < PILL_PREFIX_OPTIONS.length - 1 ? "1px solid var(--line)" : "none",
                  transition: "background .1s, color .1s",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <CalendarFilters
        filters={filters}
        channelOptions={channelOptions}
        statusOptions={statusOptions}
        assetTypeOptions={assetTypeOptions}
        labelOptions={labelOptions}
        queryInput={queryInput}
        onToggleChannel={(v) => setFilters((p) => ({ ...p, channels: toggleInSet(p.channels, v) }))}
        onToggleStatus={(v) => setFilters((p) => ({ ...p, statuses: toggleInSet(p.statuses, v) }))}
        onToggleAssetType={(v) => setFilters((p) => ({ ...p, assetTypes: toggleInSet(p.assetTypes, v) }))}
        onToggleLabel={(v) => setFilters((p) => ({ ...p, labels: toggleInSet(p.labels, v) }))}
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
          pillPrefix={pillPrefix}
          onEventClick={handleEventClick}
          editable={editable}
          onDayClick={onDayClick}
        />
      )}
      {view === "week" && (
        <WeekView
          currentDate={date}
          events={filtered}
          selectedEventId={selectedEventId}
          pillPrefix={pillPrefix}
          onEventClick={handleEventClick}
          editable={editable}
          onDayClick={onDayClick}
        />
      )}
      {view === "list" && (
        <ListView
          events={filtered}
          selectedEventId={selectedEventId}
          pillPrefix={pillPrefix}
          onEventClick={handleEventClick}
        />
      )}

      {!editable && (
        <EventDrawer
          event={selectedEvent}
          today={today}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onClose={() => setSelectedEventId(null)}
        />
      )}
    </div>
  )
}
