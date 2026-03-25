import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import CalendarView from "@/components/viewer/CalendarView"

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: brandAccess } = await supabase
    .from("user_brand_access")
    .select("brand_id")
    .eq("user_id", user.id)
  const brandIds = brandAccess?.map((b) => b.brand_id) ?? []

  // 3개월 범위 로드
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
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900">운영 캘린더</h1>
      <CalendarView events={events ?? []} />
    </div>
  )
}
