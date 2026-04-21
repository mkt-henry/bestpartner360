// src/components/viewer/calendar/views/MonthView.tsx
"use client"

import { useMemo, useState } from "react"
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

  const [popoverFor, setPopoverFor] = useState<{ key: string; anchor: HTMLElement } | null>(null)

  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <div style={{
      background: "var(--bg-1)",
      border: "1px solid var(--line)",
      borderRadius: 10,
      overflow: "hidden",
    }}>
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
                data-day-key={key}
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
                          onClick={(e) => {
                            const cell = (e.currentTarget as HTMLElement).closest<HTMLElement>(`[data-day-key="${key}"]`)
                            if (cell) setPopoverFor({ key, anchor: cell })
                          }}
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

      {popoverFor && byDate[popoverFor.key] && (() => {
        const popDate = new Date(popoverFor.key)
        const wd = ["일","월","화","수","목","금","토"][popDate.getDay()]
        const pretty = `${popDate.getFullYear()}년 ${popDate.getMonth() + 1}월 ${popDate.getDate()}일 ${wd}`
        return (
          <DayPopover
            anchor={popoverFor.anchor}
            dayLabel={pretty}
            events={byDate[popoverFor.key]}
            selectedEventId={selectedEventId}
            onClose={() => setPopoverFor(null)}
            onEventClick={onEventClick}
          />
        )
      })()}
    </div>
  )
}
