export const dynamic = "force-dynamic"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { formatNumber, formatCurrency } from "@/lib/utils"
import { TrendingUp, AlertCircle } from "lucide-react"
import Ga4UtmDashboard from "@/components/viewer/Ga4UtmDashboard"

export default async function DashboardGa4Page() {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandIdsHeader = h.get("x-user-brand-ids")

  if (!userId) redirect("/login")

  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []

  if (brandIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <AlertCircle className="w-10 h-10 mb-3" />
        <p>연결된 브랜드가 없습니다.</p>
      </div>
    )
  }

  const supabase = await createClient()

  const { data: utmEntries } = await supabase
    .from("ga4_utm_entries")
    .select("*")
    .in("brand_id", brandIds)
    .order("created_at", { ascending: false })

  const entryIds = utmEntries?.map((e) => e.id) ?? []

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const today = now.toISOString().slice(0, 10)

  const { data: perfData } = entryIds.length > 0
    ? await supabase
        .from("ga4_utm_performance")
        .select("*")
        .in("utm_entry_id", entryIds)
        .gte("record_date", monthStart)
        .lte("record_date", today)
        .order("record_date")
    : { data: [] }

  const entriesWithPerf = (utmEntries ?? []).map((e) => ({
    ...e,
    performance: (perfData ?? []).filter((p) => p.utm_entry_id === e.id),
  }))

  // 전체 집계
  const allPerf = perfData ?? []
  const totals = {
    sessions: allPerf.reduce((s, p) => s + p.sessions, 0),
    users: allPerf.reduce((s, p) => s + p.users, 0),
    pageviews: allPerf.reduce((s, p) => s + p.pageviews, 0),
    conversions: allPerf.reduce((s, p) => s + p.conversions, 0),
    revenue: allPerf.reduce((s, p) => s + Number(p.revenue), 0),
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-5 h-5 text-slate-500" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">GA4 UTM 성과</h1>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "세션", value: formatNumber(totals.sessions) },
          { label: "사용자", value: formatNumber(totals.users) },
          { label: "페이지뷰", value: formatNumber(totals.pageviews) },
          { label: "전환수", value: formatNumber(totals.conversions) },
          { label: "수익", value: formatCurrency(totals.revenue) },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs text-slate-400 mb-1">{card.label}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{card.value}</p>
          </div>
        ))}
      </div>

      {/* UTM별 상세 */}
      <Ga4UtmDashboard entries={entriesWithPerf} />
    </div>
  )
}
