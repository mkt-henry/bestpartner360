import { createClient } from "@/lib/supabase/server"
import AdminCalendarShell from "@/components/admin/calendar/AdminCalendarShell"
import type { CalendarEvent } from "@/types"

export default async function AdminCalendarPage() {
  const supabase = await createClient()

  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
  const to = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10)

  const [brandsRes, campaignsRes, eventsRes] = await Promise.all([
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("campaigns").select("id, name, brand_id, channel").order("name"),
    supabase
      .from("calendar_events")
      .select(`
        id, brand_id, campaign_id, title, channel, asset_type, event_date, status, description, labels, published_url,
        creatives(
          id, title, asset_type, status, description,
          creative_versions(id, version_number, file_path, file_url, uploaded_at, original_filename),
          creative_comments(
            id, content, created_at, user_id, version_number,
            user_profiles(full_name, role)
          )
        )
      `)
      .gte("event_date", from)
      .lte("event_date", to)
      .order("event_date"),
  ])

  return (
    <div className="canvas">
      <AdminCalendarShell
        brands={brandsRes.data ?? []}
        campaigns={campaignsRes.data ?? []}
        events={(eventsRes.data ?? []) as CalendarEvent[]}
      />
    </div>
  )
}
