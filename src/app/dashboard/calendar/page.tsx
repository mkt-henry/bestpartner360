import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import CalendarView from "@/components/viewer/calendar/CalendarView"
import { Topbar, FooterBar } from "@/components/console/Topbar"
import { fetchCalendarEvents } from "@/lib/calendar-events"
import { getCalendarQueryRange } from "@/lib/calendar-query-range"
import type { CalendarEvent } from "@/types"

interface PageProps {
  searchParams: Promise<{ date?: string | string[] }>
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandIdsHeader = h.get("x-user-brand-ids")
  if (!userId) redirect("/login")

  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []
  const { date } = await searchParams

  const supabase = await createClient()
  const { from, to } = getCalendarQueryRange(date)

  const { data: events } = await fetchCalendarEvents(supabase, {
    brandIds,
    from,
    to,
    includeCreativeComments: true,
  })

  return (
    <>
      <Topbar crumbs={[{ label: "워크스페이스" }, { label: "캘린더", strong: true }]} />
      <div className="canvas">
        <div className="page-head">
          <div>
            <h1>
              운영 <em>캘린더</em>
            </h1>
            <div className="sub">
              {(events ?? []).length}건 &nbsp; · &nbsp; {from} — {to}
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="p-body">
            <CalendarView events={(events ?? []) as unknown as CalendarEvent[]} currentUserId={userId} />
          </div>
        </div>
      </div>
      <FooterBar />
    </>
  )
}
