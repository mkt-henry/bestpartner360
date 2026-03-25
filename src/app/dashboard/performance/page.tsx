import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { formatCurrency, formatNumber } from "@/lib/utils"
import KpiCard from "@/components/viewer/KpiCard"
import { SpendBarChart, KpiLineChart } from "@/components/viewer/SpendChart"
import type { KpiDefinition } from "@/types"
import { AlertCircle } from "lucide-react"

export default async function PerformancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // 접근 가능한 브랜드
  const { data: brandAccess } = await supabase
    .from("user_brand_access")
    .select("brand_id")
    .eq("user_id", user.id)
  const brandIds = brandAccess?.map((b) => b.brand_id) ?? []

  if (brandIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <AlertCircle className="w-10 h-10 mb-3" />
        <p>연결된 브랜드가 없습니다.</p>
      </div>
    )
  }

  // 캠페인 목록
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, channel, status, start_date, end_date")
    .in("brand_id", brandIds)
    .order("created_at", { ascending: false })

  const campaignIds = campaigns?.map((c) => c.id) ?? []

  // 이번달 기준
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const today = now.toISOString().slice(0, 10)

  // KPI 정의 (visible 한 것만)
  const { data: kpiDefs } = await supabase
    .from("kpi_definitions")
    .select("*")
    .in("campaign_id", campaignIds)
    .eq("is_visible", true)
    .order("display_order")

  // 이번달 성과 데이터
  const { data: perfRecords } = await supabase
    .from("performance_records")
    .select("campaign_id, record_date, values")
    .in("campaign_id", campaignIds)
    .gte("record_date", monthStart)
    .lte("record_date", today)
    .order("record_date")

  // 이번달 지출
  const { data: spendRecords } = await supabase
    .from("spend_records")
    .select("campaign_id, spend_date, amount")
    .in("campaign_id", campaignIds)
    .gte("spend_date", monthStart)
    .lte("spend_date", today)
    .order("spend_date")

  // 예산
  const { data: budgets } = await supabase
    .from("budgets")
    .select("campaign_id, total_budget, period_start, period_end")
    .in("campaign_id", campaignIds)
    .lte("period_start", today)
    .gte("period_end", today)

  const totalBudget = budgets?.reduce((s, b) => s + Number(b.total_budget), 0) ?? 0
  const totalSpend = spendRecords?.reduce((s, r) => s + Number(r.amount), 0) ?? 0
  const budgetPercent = totalBudget > 0 ? Math.min(100, (totalSpend / totalBudget) * 100) : 0

  // KPI 집계 (metric_key별 합산)
  const kpiTotals: Record<string, number> = {}
  if (perfRecords && kpiDefs) {
    for (const rec of perfRecords) {
      for (const def of kpiDefs) {
        const val = (rec.values as Record<string, number>)[def.metric_key]
        if (val !== undefined) {
          kpiTotals[def.metric_key] = (kpiTotals[def.metric_key] ?? 0) + val
        }
      }
    }
  }

  // 중복 metric_key 제거 (여러 캠페인에 같은 key가 있을 수 있음)
  const uniqueKpiDefs = Array.from(
    new Map((kpiDefs ?? []).map((d: KpiDefinition) => [d.metric_key, d])).values()
  )

  // 일별 KPI 차트 데이터
  const dateMap: Record<string, Record<string, number>> = {}
  if (perfRecords) {
    for (const rec of perfRecords) {
      if (!dateMap[rec.record_date]) dateMap[rec.record_date] = {}
      for (const [k, v] of Object.entries(rec.values as Record<string, number>)) {
        dateMap[rec.record_date][k] = (dateMap[rec.record_date][k] ?? 0) + v
      }
    }
  }

  const kpiChartData = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }))

  // 일별 지출 차트 데이터
  const spendChartData: Record<string, number> = {}
  if (spendRecords) {
    for (const r of spendRecords) {
      spendChartData[r.spend_date] = (spendChartData[r.spend_date] ?? 0) + Number(r.amount)
    }
  }
  const spendChartArr = Object.entries(spendChartData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }))

  const CHART_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900">성과 현황</h1>

      {/* KPI Cards */}
      {uniqueKpiDefs.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">KPI 지표</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {uniqueKpiDefs.map((def) => {
              const total = kpiTotals[def.metric_key] ?? 0
              const formatted = def.unit === "원"
                ? formatCurrency(total)
                : formatNumber(total)
              return (
                <KpiCard
                  key={def.metric_key}
                  label={def.label}
                  value={formatted}
                  unit={def.unit !== "원" ? def.unit : undefined}
                />
              )
            })}
          </div>
        </div>
      ) : null}

      {/* KPI 추이 차트 */}
      {uniqueKpiDefs.length > 0 && kpiChartData.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">KPI 추이</h3>
          <KpiLineChart
            data={kpiChartData}
            metrics={uniqueKpiDefs.map((d, i) => ({
              key: d.metric_key,
              label: d.label,
              color: CHART_COLORS[i % CHART_COLORS.length],
            }))}
          />
        </div>
      )}

      {/* 예산 / 지출 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <h3 className="text-sm font-semibold text-slate-900">예산 현황</h3>

        {totalBudget > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">총 예산</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(totalBudget)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">누적 지출</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(totalSpend)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">잔여 예산</p>
                <p className="text-xl font-bold text-emerald-600">
                  {formatCurrency(totalBudget - totalSpend)}
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>지출률</span>
                <span className="font-semibold">{budgetPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${budgetPercent}%`,
                    backgroundColor: budgetPercent > 90 ? "#ef4444" : budgetPercent > 70 ? "#f59e0b" : "#10b981",
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">등록된 예산 정보가 없습니다.</p>
        )}

        {/* 일별 지출 차트 */}
        {spendChartArr.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-600 mb-3">일별 지출</p>
            <SpendBarChart data={spendChartArr} />
          </div>
        )}
      </div>

      {/* 캠페인 목록 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">캠페인 현황</h3>
        {campaigns && campaigns.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {campaigns.map((c) => {
              const campSpend = spendRecords
                ?.filter((r) => r.campaign_id === c.id)
                .reduce((s, r) => s + Number(r.amount), 0) ?? 0
              const campBudget = budgets
                ?.filter((b) => b.campaign_id === c.id)
                .reduce((s, b) => s + Number(b.total_budget), 0) ?? 0
              const pct = campBudget > 0 ? (campSpend / campBudget) * 100 : 0

              return (
                <div key={c.id} className="py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                        {c.channel}
                      </span>
                      <span className="text-sm font-medium text-slate-900 truncate">{c.name}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ml-auto flex-shrink-0 ${
                          c.status === "active"
                            ? "bg-green-100 text-green-700"
                            : c.status === "paused"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {c.status === "active" ? "진행중" : c.status === "paused" ? "일시중지" : "종료"}
                      </span>
                    </div>
                    {campBudget > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>{formatCurrency(campSpend)} 지출</span>
                          <span>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">캠페인이 없습니다.</p>
        )}
      </div>
    </div>
  )
}
