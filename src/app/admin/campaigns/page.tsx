import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Megaphone, Plus, Settings } from "lucide-react"

export default async function AdminCampaignsPage() {
  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, channel, status, start_date, end_date, brands(name)")
    .order("created_at", { ascending: false })

  const { data: brands } = await supabase.from("brands").select("id, name").order("name")

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-5 h-5 text-slate-500" />
          <h1 className="text-xl font-bold text-slate-900">캠페인 / KPI 관리</h1>
        </div>
        <Link
          href="/admin/campaigns/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          캠페인 추가
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">브랜드</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">캠페인명</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">채널</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">상태</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">기간</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-sm text-slate-400 text-center">
                  캠페인이 없습니다.
                </td>
              </tr>
            )}
            {campaigns?.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition">
                <td className="px-5 py-3 text-sm text-slate-600">
                  {(c.brands as unknown as { name: string } | null)?.name ?? "-"}
                </td>
                <td className="px-5 py-3 text-sm font-medium text-slate-900">{c.name}</td>
                <td className="px-5 py-3">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {c.channel}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      c.status === "active"
                        ? "bg-green-100 text-green-700"
                        : c.status === "paused"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {c.status === "active" ? "진행중" : c.status === "paused" ? "일시중지" : "종료"}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-slate-500">
                  {c.start_date} ~ {c.end_date ?? "진행중"}
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/campaigns/${c.id}/kpi`}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      KPI
                    </Link>
                    <Link
                      href={`/admin/campaigns/${c.id}/data`}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      수치 입력
                    </Link>
                    <Link
                      href={`/admin/campaigns/${c.id}/budget`}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      예산
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
