import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import CalendarView from "@/components/viewer/calendar/CalendarView"
import type { CalendarEvent } from "@/types"

export default async function AdminViewerCalendarPage({
  params,
}: {
  params: Promise<{ brandId: string }>
}) {
  const { brandId } = await params
  const brandIds = [brandId]
  const h = await headers()
  const userId = h.get("x-user-id") ?? ""

  const supabase = await createClient()
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
  const to = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10)

  const { data: events } = await supabase
    .from("calendar_events")
    .select(`
      id, brand_id, campaign_id, title, channel, asset_type, event_date, status, description,
      creatives(
        id, title, asset_type, status, description,
        creative_versions(id, version_number, file_path, file_url, uploaded_at, original_filename),
        creative_comments(
          id, content, created_at, user_id, version_number,
          user_profiles(full_name, role)
        )
      )
    `)
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
      <CalendarView events={(events ?? []) as unknown as CalendarEvent[]} currentUserId={userId} />
    </div>
  )
}
