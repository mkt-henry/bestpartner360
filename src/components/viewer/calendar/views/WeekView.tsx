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
