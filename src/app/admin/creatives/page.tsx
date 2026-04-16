import { createClient } from "@/lib/supabase/server"
import CreativeUploadForm from "@/components/admin/CreativeUploadForm"
import Link from "next/link"
import { STATUS_LABELS } from "@/types"
import type { CalendarEventStatus } from "@/types"

const STATUS_INLINE_COLORS: Record<CalendarEventStatus, { background: string; color: string }> = {
  draft: { background: "var(--bg-2)", color: "var(--text-2)" },
  review_requested: { background: "#1877F220", color: "#6FA8F5" },
  feedback_pending: { background: "#8aa6a11f", color: "var(--amber)" },
  in_revision: { background: "#e5553b1a", color: "var(--bad)" },
  upload_scheduled: { background: "#c77dd620", color: "var(--plum)" },
  completed: { background: "#5ec27a1a", color: "var(--good)" },
}

export default async function AdminCreativesPage() {
  const supabase = await createClient()
  const { data: brands } = await supabase.from("brands").select("id, name").order("name")
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, brand_id, channel")
    .order("name")

  const { data: creatives } = await supabase
    .from("creatives")
    .select("id, title, channel, asset_type, status, scheduled_date, brands(name)")
    .order("created_at", { ascending: false })
    .limit(30)

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1>소재 <em>관리</em></h1>
          <p className="sub">소재 관리</p>
        </div>
      </div>

      <div className="panel">
        <div className="p-head">
          <h3>소재 등록</h3>
        </div>
        <div className="p-body">
          <CreativeUploadForm brands={brands ?? []} campaigns={campaigns ?? []} />
        </div>
      </div>

      <div className="panel">
        <div className="p-head">
          <h3>소재 목록</h3>
        </div>
        <div className="p-body" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>브랜드</th>
                  <th>소재명</th>
                  <th>채널</th>
                  <th>상태</th>
                  <th>예정일</th>
                </tr>
              </thead>
              <tbody>
                {creatives?.map((c) => {
                  const statusStyle = STATUS_INLINE_COLORS[c.status as CalendarEventStatus] ?? {}
                  return (
                    <tr key={c.id}>
                      <td style={{ color: "var(--dim)" }}>
                        {(c.brands as unknown as { name: string } | null)?.name}
                      </td>
                      <td>
                        <Link
                          href={`/dashboard/creatives/${c.id}`}
                          style={{ color: "var(--amber)" }}
                        >
                          {c.title}
                        </Link>
                      </td>
                      <td>
                        {c.channel && (
                          <span className={`tag ${c.channel.toLowerCase()}`}>{c.channel}</span>
                        )}
                      </td>
                      <td>
                        <span className="tag" style={statusStyle}>
                          {STATUS_LABELS[c.status as CalendarEventStatus]}
                        </span>
                      </td>
                      <td style={{ color: "var(--dim)" }}>
                        {c.scheduled_date ?? "-"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
