// src/components/viewer/calendar/EventPill.tsx
"use client"

import type { CalendarEvent } from "@/types"
import { STATUS_LABELS } from "@/types"
import type { CalendarEventStatus } from "@/types"
import {
  channelColor, channelTagClass, STATUS_DOT_COLOR,
} from "./lib/calendar-utils"

export type PillPrefix = "status" | "channel" | "both" | "none"

interface EventPillProps {
  event: CalendarEvent
  selected?: boolean
  pillPrefix?: PillPrefix
  onClick: (ev: CalendarEvent) => void
}

export default function EventPill({ event, selected, pillPrefix = "status", onClick }: EventPillProps) {
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
        padding: "5px 8px 5px 10px",
        borderRadius: 5,
        textAlign: "left",
        position: "relative",
        background: selected ? "var(--bg-2)" : "transparent",
        transition: "background .12s",
        cursor: "pointer",
        fontSize: 12,
      }}
      className="cal-pill"
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 0, top: 3, bottom: 3,
          width: 2,
          borderRadius: 1,
          background: leftBar,
        }}
      />

      {/* 상태: 텍스트. 둘다: 컬러닷 */}
      {pillPrefix === "status" && (
        <span style={{ fontSize: 10, color: statusColor, fontWeight: 500, flexShrink: 0 }}>
          {statusLabel}
        </span>
      )}
      {pillPrefix === "both" && (
        <span
          aria-hidden
          style={{
            width: 7, height: 7, borderRadius: "50%",
            background: statusColor, flexShrink: 0,
          }}
        />
      )}

      {(pillPrefix === "channel" || pillPrefix === "both") && event.channel && (
        <span
          className={channelTagClass(event.channel)}
          style={{ fontSize: 10, padding: "1px 6px", flexShrink: 0 }}
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
    </button>
  )
}
