import { createClient } from "@/lib/supabase/server"
import ActivityForm from "@/components/admin/ActivityForm"
import { FileText } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function AdminActivityPage() {
  const supabase = await createClient()
  const { data: brands } = await supabase.from("brands").select("id, name").order("name")
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, brand_id, channel")
    .order("name")

  const { data: activities } = await supabase
    .from("activities")
    .select("id, title, channel, activity_date, brands(name)")
    .order("activity_date", { ascending: false })
    .limit(20)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-5 h-5 text-slate-500" />
        <h1 className="text-xl font-bold text-slate-900">운영 현황 작성</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">새 운영 현황 등록</h2>
        <ActivityForm brands={brands ?? []} campaigns={campaigns ?? []} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">최근 운영 현황</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {activities?.map((a) => (
            <div key={a.id} className="px-5 py-3.5 hover:bg-slate-50 transition">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs text-slate-400">{formatDate(a.activity_date)}</span>
                {a.channel && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    {a.channel}
                  </span>
                )}
                <span className="text-xs text-slate-400 ml-auto">
                  {(a.brands as unknown as { name: string } | null)?.name}
                </span>
              </div>
              <p className="text-sm text-slate-800">{a.title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
