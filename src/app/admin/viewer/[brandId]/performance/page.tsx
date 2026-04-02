export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { formatCurrency, formatNumber } from "@/lib/utils"
import KpiCard from "@/components/viewer/KpiCard"
import { SpendBarChart, KpiLineChart } from "@/components/viewer/SpendChart"
import ChannelTabs from "@/components/viewer/ChannelTabs"
import type { KpiDefinition } from "@/types"

interface Props {
  params: Promise<{ brandId: string }>
  searchParams: Promise<{ channel?: string }>
}

export default async function AdminViewerPerformancePage({ params, searchParams }: Props) {
  const { brandId } = await params
  const brandIds = [brandId]
  const { channel: selectedChannel } = await searchParams

  const supabase = await createClient()

  const { data: allCampaigns } = await supabase
    .from("campaigns")
    .select("id, name, channel, status, start_date, end_date")
    .in("brand_id", brandIds)
    .order("created_at", { ascending: false })

  const channels = Array.from(new Set((allCampaigns ?? []).map((c) => c.channel))).sort()
  const campaigns = selectedChannel
    ? (allCampaigns ?? []).filter((c) => c.channel === selectedChannel)
    : (allCampaigns ?? [])
  const campaignIds = campaigns.map((c) => c.id)

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const today = now.toISOString().slice(0, 10)

  const [kpiDefsResult, perfResult, spendResult, budgetResult] = campaignIds.length > 0
    ? await Promise.all([
        supabase.from("kpi_definitions").select("*").in("campaign_id", campaignIds).eq("is_visible", true).order("display_order"),
        supabase.from("performance_records").select("campaign_id, record_date, values").in("campaign_id", campaignIds).gte("record_date", monthStart).lte("record_date", today).order("record_date"),
        supabase.from("spend_records").select("campaign_id, spend_date, amount").in("campaign_id", campaignIds).gte("spend_date", monthStart).lte("spend_date", today).order("spend_date"),
        supabase.from("budgets").select("campaign_id, total_budget, period_start, period_end").in("campaign_id", campaignIds).lte("period_start", today).gte("period_end", today),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }]

  const kpiDefs = kpiDefsResult.data ?? []
  const perfRecords = perfResult.data ?? []
  const spendRecords = spendResult.data ?? []
  const budgets = budgetResult.data ?? []

  const totalBudget = budgets.reduce((s, b) => s + Number(b.total_budget), 0)
  const totalSpend = spendRecords.reduce((s, r) => s + Number(r.amount), 0)
  const budgetPercent = totalBudget > 0 ? Math.min(100, (totalSpend / totalBudget) * 100) : 0

  const kpiTotals: Record<string, number> = {}
  for (const rec of perfRecords) {
    for (const def of kpiDefs) {
      const val = (rec.values as Record<string, number>)[def.metric_key]
      if (val !== undefined) kpiTotals[def.metric_key] = (kpiTotals[def.metric_key] ?? 0) + val
    }
  }

  const uniqueKpiDefs = Array.from(new Map((kpiDefs as KpiDefinition[]).map((d) => [d.metric_key, d])).values())

  const dateMap: Record<string, Record<string, number>> = {}
  for (const rec of perfRecords) {
    if (!dateMap[rec.record_date]) dateMap[rec.record_date] = {}
    for (const [k, v] of Object.entries(rec.values as Record<string, number>)) {
      dateMap[rec.record_date][k] = (dateMap[rec.record_date][k] ?? 0) + v
    }
  }
  const kpiChartData = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }))

  const spendChartData: Record<string, number> = {}
  for (const r of spendRecords) {
    spendChartData[r.spend_date] = (spendChartData[r.spend_date] ?? 0) + Number(r.amount)
  }
  const spendChartArr = Object.entries(spendChartData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }))

  const channelSummaries = !selectedChannel && channels.length > 1
    ? channels.map((ch) => {
        const chCampaignIds = (allCampaigns ?? []).filter((c) => c.channel === ch).map((c) => c.id)
        const chSpend = spendRecords.filter((r) => chCampaignIds.includes(r.campaign_id)).reduce((s, r) => s + Number(r.amount), 0)
        const chBudget = budgets.filter((b) => chCampaignIds.includes(b.campaign_id)).reduce((s, b) => s + Number(b.total_budget), 0)
        return { channel: ch, spend: chSpend, budget: chBudget, campaignCount: chCampaignIds.length }
      })
    : null

  const CHART_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"]
  const CHANNEL_COLORS: Record<string, string> = {
    Meta: "bg-blue-500", Instagram: "bg-pink-500", Facebook: "bg-blue-600",
    Google: "bg-yellow-500", Naver: "bg-green-500", Kakao: "bg-yellow-400",
    TikTok: "bg-slate-800", YouTube: "bg-red-500", GA4: "bg-orange-500",
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          성과 현황
          {selectedChannel && <span className="text-base font-medium text-slate-500 ml-2">· {selectedChannel}</span>}
        </h1>
      </div>

      {channels.length > 1 && (
        <ChannelTabs channels={channels} currentChannel={selectedChannel ?? null} basePath={`/admin/viewer/${brandId}/performance`} />
      )}

      {channelSummaries && channelSummaries.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {channelSummaries.map((cs) => (
            <div key={cs.channel} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full ${CHANNEL_COLORS[cs.channel] ?? "bg-slate-400"}`} />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{cs.channel}</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">캠페인</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{cs.campaignCount}개</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">지출</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(cs.spend)}</span>
                </div>
                {cs.budget > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">예산</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(cs.budget)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {uniqueKpiDefs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">KPI 지표</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {uniqueKpiDefs.map((def) => {
              const total = kpiTotals[def.metric_key] ?? 0
              const formatted = def.unit === "원" ? formatCurrency(total) : formatNumber(total)
              return <KpiCard key={def.metric_key} label={def.label} value={formatted} unit={def.unit !== "원" ? def.unit : undefined} />
            })}
          </div>
        </div>
      )}

      {uniqueKpiDefs.length > 0 && kpiChartData.length > 1 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">KPI 추이</h3>
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

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">예산 현황</h3>
        {totalBudget > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">총 예산</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totalBudget)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">누적 지출</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totalSpend)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">잔여 예산</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalBudget - totalSpend)}</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>지출률</span>
                <span className="font-semibold">{budgetPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
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
        {spendChartArr.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">일별 지출</p>
            <SpendBarChart data={spendChartArr} />
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">캠페인 현황</h3>
        {campaigns.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {campaigns.map((c) => {
              const campSpend = spendRecords.filter((r) => r.campaign_id === c.id).reduce((s, r) => s + Number(r.amount), 0)
              const campBudget = budgets.filter((b) => b.campaign_id === c.id).reduce((s, b) => s + Number(b.total_budget), 0)
              const pct = campBudget > 0 ? (campSpend / campBudget) * 100 : 0
              return (
                <div key={c.id} className="py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-medium">{c.channel}</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{c.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ml-auto flex-shrink-0 ${c.status === "active" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : c.status === "paused" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
                        {c.status === "active" ? "진행중" : c.status === "paused" ? "일시중지" : "종료"}
                      </span>
                    </div>
                    {campBudget > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>{formatCurrency(campSpend)} 지출</span>
                          <span>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            {selectedChannel ? `${selectedChannel} 채널에 해당하는 캠페인이 없습니다.` : "캠페인이 없습니다."}
          </p>
        )}
      </div>
    </div>
  )
}
