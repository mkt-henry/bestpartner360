import { createClient } from "@/lib/supabase/server"
import CalendarEventForm from "@/components/admin/CalendarEventForm"
import { STATUS_LABELS } from "@/types"
import type { CalendarEventStatus } from "@/types"

const STATUS_INLINE_COLORS: Record<CalendarEventStatus, { background: string; color: string }> = {
  draft: { background: "var(--bg-2)", color: "var(--text-2)" },
  review_requested: { background: "#1877F220", color: "#6FA8F5" },
  feedback_pending: { background: "#e8b04b1f", color: "var(--amber)" },
  in_revision: { background: "#e5553b1a", color: "var(--bad)" },
  upload_scheduled: { background: "#c77dd620", color: "var(--plum)" },
  completed: { background: "#5ec27a1a", color: "var(--good)" },
}

export default async function AdminCalendarPage() {
  const supabase = await createClient()
  const { data: brands } = await supabase.from("brands").select("id, name").order("name")
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, brand_id, channel")
    .order("name")

  const now = new Date()
  const from = new Date(now)
  from.setDate(now.getDate() - 7)

  const { data: events } = await supabase
    .from("calendar_events")
    .select("id, title, channel, event_date, status, brands(name)")
    .gte("event_date", from.toISOString().slice(0, 10))
    .order("event_date", { ascending: false })
    .limit(30)

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1>Calendar <em>Events</em></h1>
          <p className="sub">캘린더 관리</p>
        </div>
      </div>

      <div className="panel">
        <div className="p-head">
          <h3>일정 등록</h3>
        </div>
        <div className="p-body">
          <CalendarEventForm brands={brands ?? []} campaigns={campaigns ?? []} />
        </div>
      </div>

      <div className="panel">
        <div className="p-head">
          <h3>최근 일정</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {events?.map((ev) => {
            const statusStyle = STATUS_INLINE_COLORS[ev.status as CalendarEventStatus] ?? {}
            return (
              <div
                key={ev.id}
                style={{
                  padding: "12px 18px",
                  borderBottom: "1px solid var(--line)",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  transition: "background .15s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--dim)" }}>{ev.event_date}</span>
                    {ev.channel && (
                      <span className={`tag ${ev.channel.toLowerCase()}`}>{ev.channel}</span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text)" }}>{ev.title}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: "var(--dim)" }}>
                    {(ev.brands as unknown as { name: string } | null)?.name}
                  </span>
                  <span className="tag" style={statusStyle}>
                    {STATUS_LABELS[ev.status as CalendarEventStatus]}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
