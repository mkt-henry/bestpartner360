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
