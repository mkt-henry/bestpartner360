// src/components/viewer/calendar/views/ListView.tsx
"use client"

import { useEffect, useMemo, useRef } from "react"
import { getDay, parseISO } from "date-fns"
import type { CalendarEvent } from "@/types"
import EventPill, { type PillPrefix } from "../EventPill"
import {
  formatDateKey, getRelativeDateLabel, groupEventsByDate,
} from "../lib/calendar-utils"

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

interface ListViewProps {
  events: CalendarEvent[]
  selectedEventId: string | null
  onEventClick: (ev: CalendarEvent) => void
  pillPrefix?: PillPrefix
}

export default function ListView({
  events, selectedEventId, onEventClick, pillPrefix = "status",
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
    if (!el) return
    const offset = el.getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo({ top: offset, behavior: "instant" })
  }, [todayKey])

  if (sortedKeys.length === 0) {
    return (
      <div style={{
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: 48,
        textAlign: "center",
        color: "var(--dim)",
        fontSize: 13,
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
              padding: "12px 20px",
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              fontSize: 13,
              color: "var(--text-2)",
              background: "color-mix(in srgb, var(--bg-2) 60%, transparent)",
              borderBottom: "1px solid var(--line)",
            }}>
              {rel && (
                <span style={{
                  color: isTodayGroup ? "var(--amber)" : "var(--text)",
                  fontWeight: 600,
                }}>{rel}</span>
              )}
              <span style={{ color: "var(--text-2)" }}>
                {key} ({weekday})
              </span>
              <span style={{ color: "var(--dim)", marginLeft: "auto", fontSize: 11 }}>
                {dayEvents.length}건
              </span>
            </header>
            <div style={{
              padding: "8px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}>
              {dayEvents.map((ev) => (
                <EventPill
                  key={ev.id}
                  event={ev}
                  selected={ev.id === selectedEventId}
                  pillPrefix={pillPrefix}
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
