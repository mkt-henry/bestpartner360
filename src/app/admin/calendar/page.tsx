import { createClient } from "@/lib/supabase/server"
import AdminCalendarShell from "@/components/admin/calendar/AdminCalendarShell"
import { fetchCalendarEvents } from "@/lib/calendar-events"
import { getCalendarQueryRange } from "@/lib/calendar-query-range"
import type { CalendarEvent } from "@/types"

interface PageProps {
  searchParams: Promise<{ date?: string | string[] }>
}

export default async function AdminCalendarPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { date } = await searchParams

  const { from, to } = getCalendarQueryRange(date)

  const [brandsRes, campaignsRes, eventsRes] = await Promise.all([
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("campaigns").select("id, name, brand_id, channel").order("name"),
    fetchCalendarEvents(supabase, { from, to }),
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
