// src/components/viewer/calendar/EventDrawer.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { X, Download, Send } from "lucide-react"
import type {
  CalendarEvent,
  CalendarEventCreative,
  CalendarEventStatus,
} from "@/types"
import { STATUS_LABELS } from "@/types"
import { parseISO } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { channelTagClass, getRelativeDateLabel, STATUS_DOT_COLOR } from "./lib/calendar-utils"

interface EventDrawerProps {
  event: CalendarEvent | null
  today: Date
  currentUserId?: string
  onClose: () => void
}

export default function EventDrawer({ event, today, currentUserId, onClose }: EventDrawerProps) {
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

            {(event.creatives?.length ?? 0) > 0 && (
              <>
                <SectionHeader>소재 ({event.creatives?.length})</SectionHeader>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {event.creatives?.map((c) => (
                    <CreativeBlock
                      key={c.id}
                      creative={c}
                      currentUserId={currentUserId}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </aside>,
    document.body
  )
}

function CreativeBlock({
  creative,
  currentUserId,
}: {
  creative: CalendarEventCreative
  currentUserId?: string
}) {
  const router = useRouter()
  const [newComment, setNewComment] = useState("")
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const versions = [...creative.creative_versions].sort(
    (a, b) => b.version_number - a.version_number,
  )
  const latest = versions[0]
  const comments = [...(creative.creative_comments ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || !currentUserId) return
    setPosting(true)
    setError(null)
    const supabase = createClient()
    const { error: dbError } = await supabase.from("creative_comments").insert({
      creative_id: creative.id,
      user_id: currentUserId,
      content: newComment.trim(),
    })
    setPosting(false)
    if (dbError) {
      setError(dbError.message)
      return
    }
    setNewComment("")
    router.refresh()
  }

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "var(--bg-2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="tag" style={{ fontSize: 9 }}>{creative.asset_type}</span>
        <div style={{ fontSize: 12, fontWeight: 500, flex: 1, minWidth: 0, color: "var(--text)" }}>
          {creative.title}
        </div>
        {latest && (
          <a
            href={latest.file_url}
            target="_blank"
            rel="noreferrer"
            download
            className="btn"
            style={{ fontSize: 10, padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <Download style={{ width: 11, height: 11 }} />
            v{latest.version_number}
          </a>
        )}
      </div>

      {versions.length > 1 && (
        <div
          style={{
            fontSize: 10,
            color: "var(--dim)",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          이전 버전:{" "}
          {versions.slice(1).map((v) => (
            <a
              key={v.id}
              href={v.file_url}
              target="_blank"
              rel="noreferrer"
              download
              style={{ color: "var(--dim)", textDecoration: "underline" }}
            >
              v{v.version_number}
            </a>
          ))}
        </div>
      )}

      {creative.description && (
        <p
          style={{
            fontSize: 11,
            color: "var(--text-2)",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            margin: 0,
          }}
        >
          {creative.description}
        </p>
      )}

      <div
        style={{
          borderTop: "1px solid var(--line)",
          paddingTop: 10,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--dim)",
            textTransform: "uppercase",
            letterSpacing: ".1em",
          }}
        >
          피드백 ({comments.length})
        </div>

        {comments.length > 0 && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {comments.map((c) => {
              const isAdmin = c.user_profiles?.role === "admin"
              return (
                <li
                  key={c.id}
                  style={{
                    fontSize: 11,
                    padding: "6px 8px",
                    borderRadius: 6,
                    background: isAdmin
                      ? "color-mix(in srgb, var(--amber) 10%, var(--bg-1))"
                      : "var(--bg-1)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text)" }}>
                      {c.user_profiles?.full_name ?? "사용자"}
                    </span>
                    {isAdmin && (
                      <span style={{ fontSize: 9, color: "var(--amber)" }}>대행사</span>
                    )}
                    <span style={{ fontSize: 9, color: "var(--dim)", marginLeft: "auto" }}>
                      {new Date(c.created_at).toLocaleString("ko-KR", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div style={{ color: "var(--text-2)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {c.content}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {currentUserId && (
          <form
            onSubmit={submitComment}
            style={{ display: "flex", gap: 6, alignItems: "flex-start" }}
          >
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              placeholder="피드백을 남겨주세요"
              className="form-textarea"
              style={{ flex: 1, fontSize: 11, padding: "6px 8px", minHeight: 0 }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  submitComment(e as unknown as React.FormEvent)
                }
              }}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || posting}
              className="btn primary"
              style={{ fontSize: 10, padding: "5px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <Send style={{ width: 10, height: 10 }} />
              {posting ? "전송 중" : "전송"}
            </button>
          </form>
        )}

        {error && (
          <div style={{ fontSize: 10, color: "var(--bad)" }}>전송 실패: {error}</div>
        )}
      </div>
    </div>
  )
}

function MetaGrid({ event, today }: { event: CalendarEvent; today: Date }) {
  const statusLabel = STATUS_LABELS[event.status as CalendarEventStatus] ?? event.status
  const statusColor = STATUS_DOT_COLOR[event.status] ?? "var(--dim)"
  const eventDate = parseISO(event.event_date)
  const rel = getRelativeDateLabel(eventDate, today)

  const rows: Array<[string, React.ReactNode]> = [
    ["상태", (
      <span key="status" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span aria-hidden style={{
          width: 8, height: 8, borderRadius: "50%", background: statusColor,
        }} />
        <span>{statusLabel}</span>
      </span>
    )],
    ["날짜", (
      <span key="date">
        {event.event_date}
        {rel && (
          <span style={{ color: "var(--amber)", marginLeft: 8, fontSize: 11 }}>· {rel}</span>
        )}
      </span>
    )],
    ["채널", event.channel ?? <span key="channel" style={{ color: "var(--dimmer)" }}>미지정</span>],
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
