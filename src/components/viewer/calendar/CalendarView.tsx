// src/components/viewer/calendar/CalendarView.tsx
"use client"

import { useMemo, useState } from "react"
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
  editable?: boolean
  onDayClick?: (dateKey: string) => void
  onEventEdit?: (event: CalendarEvent) => void
  currentUserId?: string
}

export default function CalendarView({
  events, editable = false, onDayClick, onEventEdit, currentUserId,
}: CalendarViewProps) {
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
          editable={editable}
          onDayClick={onDayClick}
        />
      )}
      {view === "week" && (
        <WeekView
          currentDate={date}
          events={filtered}
          selectedEventId={selectedEventId}
          onEventClick={handleEventClick}
          editable={editable}
          onDayClick={onDayClick}
        />
      )}
      {view === "list" && (
        <ListView
          events={filtered}
          selectedEventId={selectedEventId}
          onEventClick={handleEventClick}
        />
      )}

      {!editable && (
        <EventDrawer
          event={selectedEvent}
          today={today}
          currentUserId={currentUserId}
          onClose={() => setSelectedEventId(null)}
        />
      )}
    </div>
  )
}
