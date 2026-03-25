import { createClient } from "@/lib/supabase/server"
import CreativeUploadForm from "@/components/admin/CreativeUploadForm"
import Link from "next/link"
import { Image, Plus } from "lucide-react"
import { STATUS_LABELS, STATUS_COLORS } from "@/types"
import type { CalendarEventStatus } from "@/types"
import { cn } from "@/lib/utils"

export default async function AdminCreativesPage() {
  const supabase = await createClient()
  const { data: brands } = await supabase.from("brands").select("id, name").order("name")
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, brand_id, channel")
    .order("name")

  const { data: creatives } = await supabase
    .from("creatives")
    .select("id, title, channel, asset_type, status, scheduled_date, brands(name)")
    .order("created_at", { ascending: false })
    .limit(30)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Image className="w-5 h-5 text-slate-500" />
        <h1 className="text-xl font-bold text-slate-900">소재 관리</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">소재 등록</h2>
        <CreativeUploadForm brands={brands ?? []} campaigns={campaigns ?? []} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">소재 목록</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">브랜드</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">소재명</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">채널</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">상태</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">예정일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {creatives?.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition">
                <td className="px-5 py-3 text-sm text-slate-500">
                  {(c.brands as unknown as { name: string } | null)?.name}
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/dashboard/creatives/${c.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {c.title}
                  </Link>
                </td>
                <td className="px-5 py-3">
                  {c.channel && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {c.channel}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      STATUS_COLORS[c.status as CalendarEventStatus]
                    )}
                  >
                    {STATUS_LABELS[c.status as CalendarEventStatus]}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-slate-500">
                  {c.scheduled_date ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
