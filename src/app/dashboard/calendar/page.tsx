import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import CalendarView from "@/components/viewer/CalendarView"
import { Topbar, FooterBar } from "@/components/console/Topbar"

export default async function CalendarPage() {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandIdsHeader = h.get("x-user-brand-ids")
  if (!userId) redirect("/login")

  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []

  const supabase = await createClient()
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
  const to = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10)

  const { data: events } = await supabase
    .from("calendar_events")
    .select("id, title, channel, asset_type, event_date, status, description")
    .in("brand_id", brandIds)
    .gte("event_date", from)
    .lte("event_date", to)
    .order("event_date")

  return (
    <>
      <Topbar crumbs={[{ label: "Workspace" }, { label: "Calendar", strong: true }]} />
      <div className="canvas">
        <div className="page-head">
          <div>
            <h1>
              Operational <em>calendar</em>
            </h1>
            <div className="sub">
              {(events ?? []).length} events &nbsp; · &nbsp; {from} — {to}
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="p-body">
            <CalendarView events={events ?? []} />
          </div>
        </div>
      </div>
      <FooterBar />
    </>
  )
}
