import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import CalendarView from "@/components/viewer/calendar/CalendarView"
import { fetchCalendarEvents } from "@/lib/calendar-events"
import { getCalendarQueryRange } from "@/lib/calendar-query-range"
import type { CalendarEvent } from "@/types"

export default async function AdminViewerCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ brandId: string }>
  searchParams: Promise<{ date?: string | string[] }>
}) {
  const { brandId } = await params
  const brandIds = [brandId]
  const { date } = await searchParams
  const h = await headers()
  const userId = h.get("x-user-id") ?? ""

  const supabase = await createClient()
  const { from, to } = getCalendarQueryRange(date)

  const { data: events } = await fetchCalendarEvents(supabase, {
    brandIds,
    from,
    to,
    includeCreativeComments: true,
  })

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
