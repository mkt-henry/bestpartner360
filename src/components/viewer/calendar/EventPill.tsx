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
  showStatusLabel?: boolean
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
