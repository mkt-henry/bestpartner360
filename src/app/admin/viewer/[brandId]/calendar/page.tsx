import { createClient } from "@/lib/supabase/server"
import CalendarView from "@/components/viewer/CalendarView"

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
    .select("id, title, channel, asset_type, event_date, status, description")
    .in("brand_id", brandIds)
    .gte("event_date", from)
    .lte("event_date", to)
    .order("event_date")

  return (
    <div className="canvas" style={{ maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{
        fontFamily: 'var(--c-serif)', fontSize: 20, fontWeight: 700,
        color: 'var(--text)', margin: '0 0 24px',
      }}>
        운영 캘린더
      </h1>
      <CalendarView events={events ?? []} />
    </div>
  )
}
