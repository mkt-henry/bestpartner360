import { createClient } from "@/lib/supabase/server"
import ActivityForm from "@/components/admin/ActivityForm"
import { formatDate } from "@/lib/utils"

export default async function AdminActivityPage() {
  const supabase = await createClient()
  const { data: brands } = await supabase.from("brands").select("id, name").order("name")
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, brand_id, channel")
    .order("name")

  const { data: activities } = await supabase
    .from("activities")
    .select("id, title, channel, activity_date, brands(name)")
    .order("activity_date", { ascending: false })
    .limit(20)

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1>운영 <em>현황</em></h1>
          <p className="sub">운영 현황 작성</p>
        </div>
      </div>

      <div className="panel">
        <div className="p-head">
          <h3>새 운영 현황 등록</h3>
        </div>
        <div className="p-body">
          <ActivityForm brands={brands ?? []} campaigns={campaigns ?? []} />
        </div>
      </div>

      <div className="panel">
        <div className="p-head">
          <h3>최근 운영 현황</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {activities?.map((a) => (
            <div
              key={a.id}
              style={{
                padding: "12px 18px",
                borderBottom: "1px solid var(--line)",
                transition: "background .15s",
                cursor: "default",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "var(--dim)" }}>{formatDate(a.activity_date)}</span>
                {a.channel && (
                  <span className="tag neutral">{a.channel}</span>
                )}
                <span style={{ fontSize: 11, color: "var(--dim)", marginLeft: "auto" }}>
                  {(a.brands as unknown as { name: string } | null)?.name}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text)" }}>{a.title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
