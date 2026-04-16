"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { STATUS_LABELS, STATUS_COLORS } from "@/types"
import type { CalendarEventStatus } from "@/types"
import { cn } from "@/lib/utils"

interface CalendarEvent {
  id: string
  title: string
  channel: string | null
  asset_type: string | null
  event_date: string
  status: string
  description: string | null
}

export default function CalendarView({ events }: { events: CalendarEvent[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`
  const monthEvents = events.filter((e) => e.event_date.startsWith(monthStr))

  const eventsByDate: Record<string, CalendarEvent[]> = {}
  for (const ev of monthEvents) {
    const day = ev.event_date.slice(8, 10)
    if (!eventsByDate[day]) eventsByDate[day] = []
    eventsByDate[day].push(ev)
  }

  const STATUS_DOT: Record<string, string> = {
    draft: "bg-slate-400",
    review_requested: "bg-blue-500",
    feedback_pending: "bg-yellow-500",
    in_revision: "bg-orange-500",
    upload_scheduled: "bg-purple-500",
    completed: "bg-emerald-500",
  }

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // 6주 맞추기
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <div className="flex gap-6">
      {/* Calendar */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {year}년 {month + 1}월
          </h2>
          <div className="flex gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="py-2.5 text-center text-xs font-medium text-slate-400">
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
            {week.map((day, di) => {
              const dayStr = day ? `${monthStr}-${String(day).padStart(2, "0")}` : null
              const dayEvents = day ? eventsByDate[String(day).padStart(2, "0")] ?? [] : []
              const isToday = dayStr === todayStr
              const isSun = di === 0
              const isSat = di === 6

              return (
                <div
                  key={di}
                  className={cn(
                    "min-h-[88px] p-2 relative",
                    !day && "bg-slate-50 dark:bg-slate-900/30",
                    day && "hover:bg-slate-50 dark:hover:bg-slate-700/30 transition"
                  )}
                >
                  {day && (
                    <>
                      <span
                        className={cn(
                          "inline-flex w-6 h-6 items-center justify-center text-xs rounded-full mb-1.5",
                          isToday && "bg-blue-600 text-white font-bold",
                          !isToday && isSun && "text-red-500",
                          !isToday && isSat && "text-blue-500",
                          !isToday && !isSun && !isSat && "text-slate-700 dark:text-slate-300"
                        )}
                      >
                        {day}
                      </span>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <button
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className="w-full flex items-center gap-1.5 text-left hover:opacity-80 transition"
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                STATUS_DOT[ev.status] ?? "bg-slate-400"
                              )}
                            />
                            <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{ev.title}</span>
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-xs text-slate-400 pl-3">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Event Detail Panel */}
      {selectedEvent ? (
        <div className="w-80 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 self-start">
          <div className="flex justify-between items-start mb-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 pr-2 leading-snug">{selectedEvent.title}</h3>
            <button
              onClick={() => setSelectedEvent(null)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 flex-shrink-0 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 mb-1.5">상태</p>
              <span
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full font-medium",
                  STATUS_COLORS[selectedEvent.status as CalendarEventStatus]
                )}
              >
                {STATUS_LABELS[selectedEvent.status as CalendarEventStatus]}
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1.5">날짜</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{selectedEvent.event_date}</p>
            </div>

            {selectedEvent.channel && (
              <div>
                <p className="text-xs text-slate-400 mb-1.5">채널</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{selectedEvent.channel}</p>
              </div>
            )}

            {selectedEvent.asset_type && (
              <div>
                <p className="text-xs text-slate-400 mb-1.5">소재 유형</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{selectedEvent.asset_type}</p>
              </div>
            )}

            {selectedEvent.description && (
              <div>
                <p className="text-xs text-slate-400 mb-1.5">설명</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {selectedEvent.description}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-80 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 text-sm self-start min-h-[140px]">
          일정을 클릭하세요
        </div>
      )}
    </div>
  )
}
