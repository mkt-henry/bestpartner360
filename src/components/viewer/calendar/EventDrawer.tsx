// src/components/viewer/calendar/EventDrawer.tsx
"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import type { CalendarEvent, CalendarEventStatus } from "@/types"
import { STATUS_LABELS } from "@/types"
import { parseISO } from "date-fns"
import { channelTagClass, getRelativeDateLabel, STATUS_DOT_COLOR } from "./lib/calendar-utils"

interface EventDrawerProps {
  event: CalendarEvent | null
  today: Date
  onClose: () => void
}

export default function EventDrawer({ event, today, onClose }: EventDrawerProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const open = !!event

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    closeBtnRef.current?.focus()
    return () => window.removeEventListener("keydown", onKey)
  }, [open, event?.id, onClose])

  if (typeof window === "undefined") return null

  return createPortal(
    <aside
      role="dialog"
      aria-label={event?.title ?? "이벤트 상세"}
      className="cal-drawer"
      data-open={open}
      style={{
        position: "fixed",
        top: 0, right: 0, bottom: 0,
        width: 380,
        background: "var(--bg-1)",
        borderLeft: "1px solid var(--line)",
        zIndex: 40,
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform .28s cubic-bezier(.2,.7,.2,1)",
        display: "flex",
        flexDirection: "column",
        boxShadow: open ? "-12px 0 40px #0008" : "none",
      }}
    >
      {event && (
        <>
          <header style={{
            padding: "22px 24px 16px",
            borderBottom: "1px solid var(--line)",
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10,
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: ".12em",
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                {event.channel ? (
                  <span className={channelTagClass(event.channel)} style={{ fontSize: 9 }}>
                    {event.channel}
                  </span>
                ) : (
                  <span style={{ color: "var(--dimmer)" }}>미지정</span>
                )}
              </div>
              <h2 style={{
                fontFamily: "var(--c-serif)",
                fontSize: 22,
                fontWeight: 400,
                letterSpacing: "-.02em",
                lineHeight: 1.2,
                color: "var(--text)",
              }}>{event.title}</h2>
            </div>
            <button
              ref={closeBtnRef}
              onClick={onClose}
              aria-label="닫기"
              style={{
                width: 32, height: 32,
                border: "1px solid var(--line)",
                borderRadius: 7,
                display: "grid",
                placeItems: "center",
                color: "var(--text-2)",
                flexShrink: 0,
              }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </header>

          <div style={{ padding: "22px 24px", overflowY: "auto", flex: 1 }}>
            <MetaGrid event={event} today={today} />
            {event.description && (
              <>
                <SectionHeader>설명</SectionHeader>
                <p style={{
                  fontSize: 12,
                  color: "var(--text-2)",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}>
                  {event.description}
                </p>
              </>
            )}
          </div>
        </>
      )}
    </aside>,
    document.body
  )
}

function MetaGrid({ event, today }: { event: CalendarEvent; today: Date }) {
  const statusLabel = STATUS_LABELS[event.status as CalendarEventStatus] ?? event.status
  const statusColor = STATUS_DOT_COLOR[event.status] ?? "var(--dim)"
  const eventDate = parseISO(event.event_date)
  const rel = getRelativeDateLabel(eventDate, today)

  const rows: Array<[string, React.ReactNode]> = [
    ["상태", (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span aria-hidden style={{
          width: 8, height: 8, borderRadius: "50%", background: statusColor,
        }} />
        <span>{statusLabel}</span>
      </span>
    )],
    ["날짜", (
      <span>
        {event.event_date}
        {rel && (
          <span style={{ color: "var(--amber)", marginLeft: 8, fontSize: 11 }}>· {rel}</span>
        )}
      </span>
    )],
    ["채널", event.channel ?? <span style={{ color: "var(--dimmer)" }}>미지정</span>],
    ["소재 유형", event.asset_type ?? <span style={{ color: "var(--dimmer)" }}>미지정</span>],
  ]

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "72px 1fr",
      rowGap: 12,
      columnGap: 16,
      alignItems: "baseline",
      fontSize: 12,
    }}>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: "contents" }}>
          <span style={{
            fontSize: 10,
            color: "var(--dim)",
            textTransform: "uppercase",
            letterSpacing: ".1em",
            paddingTop: 2,
          }}>{label}</span>
          <span style={{ color: "var(--text)" }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 style={{
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: ".14em",
      color: "var(--dim)",
      margin: "24px 0 10px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontWeight: 500,
    }}>
      <span>{children}</span>
      <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
    </h4>
  )
}
