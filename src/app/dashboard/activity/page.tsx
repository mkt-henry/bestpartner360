import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/utils"
import { Topbar, FooterBar } from "@/components/console/Topbar"

type Activity = {
  id: string
  title: string
  content: string
  channel: string | null
  activity_date: string
  campaigns: { name: string } | null
}

export default async function ActivityPage() {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandIdsHeader = h.get("x-user-brand-ids")
  if (!userId) redirect("/login")

  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []

  const supabase = await createClient()
  const { data: activities } = await supabase
    .from("activities")
    .select("id, title, content, channel, activity_date, campaigns(name)")
    .in("brand_id", brandIds)
    .order("activity_date", { ascending: false })

  const list = (activities ?? []) as unknown as Activity[]
  const grouped: Record<string, Activity[]> = {}
  for (const act of list) {
    const key = act.activity_date
    if (!grouped[key]) grouped[key] = []
    grouped[key]!.push(act)
  }
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <>
      <Topbar crumbs={[{ label: "워크스페이스" }, { label: "운영현황", strong: true }]} />

      <div className="canvas">
        <div className="page-head">
          <div>
            <h1>
              운영 <em>현황</em>
            </h1>
            <div className="sub">
              {list.length}건 &nbsp; · &nbsp; {sortedDates.length}일
            </div>
          </div>
        </div>

        {sortedDates.length === 0 ? (
          <div className="panel">
            <div className="p-body" style={{ padding: 40, textAlign: "center", color: "var(--dim)" }}>
              등록된 운영 현황이 없습니다.
            </div>
          </div>
        ) : (
          sortedDates.map((date) => (
            <div key={date} className="panel alerts">
              <div className="p-head">
                <h3>{formatDate(date)}</h3>
                <div className="sub">{grouped[date]!.length}건</div>
              </div>
              <div className="p-body">
                {grouped[date]!.map((act) => (
                  <div key={act.id} className="alert info">
                    <div className="bullet" />
                    <div className="body">
                      <div className="top">
                        <span className="tag">{act.channel ?? "일반"}</span>
                        {act.campaigns?.name && (
                          <span className="time">{act.campaigns.name}</span>
                        )}
                      </div>
                      <div className="msg">{act.title}</div>
                      {act.content && (
                        <div className="meta" style={{ whiteSpace: "pre-line" }}>{act.content}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <FooterBar />
    </>
  )
}
