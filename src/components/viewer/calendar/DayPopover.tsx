// src/components/viewer/calendar/DayPopover.tsx
"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import type { CalendarEvent } from "@/types"
import EventPill, { type PillPrefix } from "./EventPill"

interface DayPopoverProps {
  anchor: HTMLElement | null
  dayLabel: string
  events: CalendarEvent[]
  selectedEventId: string | null
  pillPrefix?: PillPrefix
  onClose: () => void
  onEventClick: (ev: CalendarEvent) => void
}

export default function DayPopover({
  anchor, dayLabel, events, selectedEventId, pillPrefix = "status", onClose, onEventClick,
}: DayPopoverProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchor) return
    const r = anchor.getBoundingClientRect()
    const width = 280
    const margin = 8
    let left = r.left
    if (left + width > window.innerWidth - margin) left = r.right - width
    if (left < margin) left = margin
    let top = r.bottom + 4
    const maxHeight = 400
    if (top + maxHeight > window.innerHeight - margin) {
      top = Math.max(margin, r.top - maxHeight - 4)
    }
    // measure-then-position pattern: layout must be read from the DOM,
    // then applied as state. Standard for floating popovers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        width: 280,
        maxHeight: 400,
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
        padding: "12px 14px",
        borderBottom: "1px solid var(--line)",
        fontSize: 12,
      }}>
        <span style={{ color: "var(--text)", flex: 1 }}>{dayLabel}</span>
        <span style={{ color: "var(--dim)" }}>{events.length}건</span>
        <button
          onClick={onClose}
          aria-label="닫기"
          style={{
            display: "grid", placeItems: "center",
            width: 24, height: 24, borderRadius: 4,
            color: "var(--dim)",
          }}
        >
          <X style={{ width: 13, height: 13 }} />
        </button>
      </div>
      <div style={{
        padding: 8, overflowY: "auto", display: "flex",
        flexDirection: "column", gap: 3, flex: 1,
      }}>
        {events.map((ev) => (
          <EventPill
            key={ev.id}
            event={ev}
            selected={ev.id === selectedEventId}
            pillPrefix={pillPrefix}
            onClick={onEventClick}
          />
        ))}
      </div>
    </div>,
    document.body
  )
}
