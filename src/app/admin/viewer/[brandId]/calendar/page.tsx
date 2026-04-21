import { createClient } from "@/lib/supabase/server"
import CalendarView from "@/components/viewer/calendar/CalendarView"

export default async function AdminViewerCalendarPage({
  params,
}: {
  params: Promise<{ brandId: string }>
}) {
  const { brandId } = await params
  const brandIds = [brandId]

  const supabase = await createClient()
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
  const to = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10)

  const { data: events } = await supabase
    .from("calendar_events")
    .select("id, brand_id, campaign_id, title, channel, asset_type, event_date, status, description")
    .in("brand_id", brandIds)
    .gte("event_date", from)
    .lte("event_date", to)
    .order("event_date")

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1>운영 <em>캘린더</em></h1>
          <div className="sub">
            {(events ?? []).length}건 &nbsp; · &nbsp; {from} — {to}
          </div>
        </div>
      </div>
      <CalendarView events={events ?? []} />
    </div>
  )
}
