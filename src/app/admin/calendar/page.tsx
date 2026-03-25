import { createClient } from "@/lib/supabase/server"
import CalendarEventForm from "@/components/admin/CalendarEventForm"
import { Calendar } from "lucide-react"
import { STATUS_LABELS, STATUS_COLORS } from "@/types"
import type { CalendarEventStatus } from "@/types"
import { cn } from "@/lib/utils"

export default async function AdminCalendarPage() {
  const supabase = await createClient()
  const { data: brands } = await supabase.from("brands").select("id, name").order("name")
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, brand_id, channel")
    .order("name")

  const now = new Date()
  const from = new Date(now)
  from.setDate(now.getDate() - 7)

  const { data: events } = await supabase
    .from("calendar_events")
    .select("id, title, channel, event_date, status, brands(name)")
    .gte("event_date", from.toISOString().slice(0, 10))
    .order("event_date", { ascending: false })
    .limit(30)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-5 h-5 text-slate-500" />
        <h1 className="text-xl font-bold text-slate-900">캘린더 관리</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">일정 등록</h2>
        <CalendarEventForm brands={brands ?? []} campaigns={campaigns ?? []} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">최근 일정</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {events?.map((e) => (
            <div key={e.id} className="px-5 py-3.5 hover:bg-slate-50 transition flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs text-slate-400">{e.event_date}</span>
                  {e.channel && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {e.channel}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-800">{e.title}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-slate-400">
                  {(e.brands as unknown as { name: string } | null)?.name}
                </span>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    STATUS_COLORS[e.status as CalendarEventStatus]
                  )}
                >
                  {STATUS_LABELS[e.status as CalendarEventStatus]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
