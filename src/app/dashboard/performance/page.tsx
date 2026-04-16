export const dynamic = "force-dynamic"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { SpendBarChart, KpiLineChart } from "@/components/viewer/SpendChart"
import { Topbar, FooterBar } from "@/components/console/Topbar"
import { Filters } from "@/components/console/Filters"
import type { KpiDefinition } from "@/types"

interface Props {
  searchParams: Promise<{ channel?: string }>
}

export default async function PerformancePage({ searchParams }: Props) {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandIdsHeader = h.get("x-user-brand-ids")

  if (!userId) redirect("/login")

  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []

  if (brandIds.length === 0) {
    return (
      <>
        <Topbar crumbs={[{ label: "워크스페이스" }, { label: "성과", strong: true }]} />
        <div className="canvas">
          <div className="panel">
            <div className="p-body" style={{ padding: 40, textAlign: "center", color: "var(--dim)" }}>
              연결된 브랜드가 없습니다.
            </div>
          </div>
        </div>
      </>
    )
  }

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
        supabase
          .from("kpi_definitions")
          .select("*")
          .in("campaign_id", campaignIds)
          .eq("is_visible", true)
          .order("display_order"),
        supabase
          .from("performance_records")
          .select("campaign_id, record_date, values")
          .in("campaign_id", campaignIds)
          .gte("record_date", monthStart)
          .lte("record_date", today)
          .order("record_date"),
        supabase
          .from("spend_records")
          .select("campaign_id, spend_date, amount")
          .in("campaign_id", campaignIds)
          .gte("spend_date", monthStart)
          .lte("spend_date", today)
          .order("spend_date"),
        supabase
          .from("budgets")
          .select("campaign_id, total_budget, period_start, period_end")
          .in("campaign_id", campaignIds)
          .lte("period_start", today)
          .gte("period_end", today),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }]

  const kpiDefs = (kpiDefsResult.data ?? []) as KpiDefinition[]
  const perfRecords = (perfResult.data ?? []) as { campaign_id: string; record_date: string; values: Record<string, number> }[]
  const spendRecords = (spendResult.data ?? []) as { campaign_id: string; spend_date: string; amount: number }[]
  const budgets = (budgetResult.data ?? []) as { campaign_id: string; total_budget: number }[]

  const totalBudget = budgets.reduce((s, b) => s + Number(b.total_budget), 0)
  const totalSpend = spendRecords.reduce((s, r) => s + Number(r.amount), 0)
  const budgetPercent = totalBudget > 0 ? Math.min(100, (totalSpend / totalBudget) * 100) : 0

  const kpiTotals: Record<string, number> = {}
  for (const rec of perfRecords) {
    for (const def of kpiDefs) {
      const val = rec.values[def.metric_key]
      if (val !== undefined) {
        kpiTotals[def.metric_key] = (kpiTotals[def.metric_key] ?? 0) + val
      }
    }
  }
  const uniqueKpiDefs = Array.from(new Map(kpiDefs.map((d) => [d.metric_key, d])).values())

  const dateMap: Record<string, Record<string, number>> = {}
  for (const rec of perfRecords) {
    if (!dateMap[rec.record_date]) dateMap[rec.record_date] = {}
    for (const [k, v] of Object.entries(rec.values)) {
      dateMap[rec.record_date]![k] = (dateMap[rec.record_date]![k] ?? 0) + v
    }
  }
  const kpiChartData = Object.entries(dateMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, vals]) => ({ date, ...vals }))

  const spendChartData: Record<string, number> = {}
  for (const r of spendRecords) {
    spendChartData[r.spend_date] = (spendChartData[r.spend_date] ?? 0) + Number(r.amount)
  }
  const spendChartArr = Object.entries(spendChartData).sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount }))

  const CHART_COLORS = ["#8AA6A1", "#7DB8D6", "#5EC27A", "#C77DD6", "#E5553B"]

  return (
    <>
      <Topbar
        crumbs={[
          { label: "워크스페이스" },
          { label: "성과", strong: !selectedChannel },
          ...(selectedChannel ? [{ label: selectedChannel, strong: true }] : []),
        ]}
      />

      <Filters />

      <div className="canvas">
        <div className="page-head">
          <div>
            <h1>
              성과 <em>상세</em>
            </h1>
            <div className="sub">
              {monthStart} — {today} &nbsp; · &nbsp; {campaigns.length}개 캠페인
              {selectedChannel && <> &nbsp; · &nbsp; {selectedChannel}</>}
            </div>
          </div>
          <div className="pg-actions">
            {channels.length > 1 && (
              <>
                <Link href="/dashboard/performance" className={`btn ${!selectedChannel ? "primary" : ""}`}>
                  전체
                </Link>
                {channels.map((ch) => (
                  <Link
                    key={ch}
                    href={`/dashboard/performance?channel=${ch}`}
                    className={`btn ${selectedChannel === ch ? "primary" : ""}`}
                  >
                    {ch}
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>

        {/* KPI row */}
        {uniqueKpiDefs.length > 0 && (
          <div className="kpi-row">
            {uniqueKpiDefs.map((def) => {
              const total = kpiTotals[def.metric_key] ?? 0
              const formatted = def.unit === "원" ? formatCurrency(total) : formatNumber(total)
              return (
                <div key={def.metric_key} className="kpi">
                  <div className="top">
                    <span>{def.label}</span>
                  </div>
                  <div className="v">
                    {formatted}
                    {def.unit && def.unit !== "원" && <span className="u">{def.unit}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Budget panel */}
        <div className="panel">
          <div className="p-head">
            <h3>예산 현황</h3>
            <div className="sub">이번 달 · {budgetPercent.toFixed(1)}% 사용</div>
          </div>
          <div className="p-body">
            {totalBudget > 0 ? (
              <>
                <div className="chart-stat">
                  <div className="s">
                    <div className="l"><i style={{ background: "#7DB8D6" }} />총 예산</div>
                    <div className="v">{formatCurrency(totalBudget)}</div>
                  </div>
                  <div className="s">
                    <div className="l"><i style={{ background: "#8AA6A1" }} />지출</div>
                    <div className="v">{formatCurrency(totalSpend)}</div>
                  </div>
                  <div className="s">
                    <div className="l"><i style={{ background: "#5EC27A" }} />잔여</div>
                    <div className="v">{formatCurrency(totalBudget - totalSpend)}</div>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <span className="hbar" style={{ width: "100%", height: 6 }}>
                    <b
                      style={{
                        width: `${budgetPercent}%`,
                        background: budgetPercent > 90 ? "var(--bad)" : budgetPercent > 70 ? "var(--amber)" : "var(--good)",
                      }}
                    />
                  </span>
                </div>
                {spendChartArr.length > 0 && (
                  <div className="chart-wrap" style={{ marginTop: 16, background: "var(--bg-2)", padding: 16, borderRadius: 6 }}>
                    <SpendBarChart data={spendChartArr} />
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: "var(--dim)", padding: 12 }}>등록된 예산 정보가 없습니다.</div>
            )}
          </div>
        </div>

        {/* KPI trend chart */}
        {uniqueKpiDefs.length > 0 && kpiChartData.length > 1 && (
          <div className="panel">
            <div className="p-head">
              <h3>KPI 추이</h3>
              <div className="sub">일별</div>
            </div>
            <div className="p-body">
              <div className="chart-wrap" style={{ background: "var(--bg-2)", padding: 16, borderRadius: 6 }}>
                <KpiLineChart
                  data={kpiChartData}
                  metrics={uniqueKpiDefs.map((d, i) => ({
                    key: d.metric_key,
                    label: d.label,
                    color: CHART_COLORS[i % CHART_COLORS.length]!,
                  }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* Campaign table */}
        <div className="panel">
          <div className="p-head">
            <h3>캠페인</h3>
            <div className="sub">{campaigns.length}건</div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "42%" }}>캠페인</th>
                  <th>채널</th>
                  <th>상태</th>
                  <th className="num">지출</th>
                  <th className="num">예산</th>
                  <th className="num">사용률</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--dim)" }}>
                      {selectedChannel ? `${selectedChannel} 채널 캠페인이 없습니다.` : "캠페인이 없습니다."}
                    </td>
                  </tr>
                )}
                {campaigns.map((c) => {
                  const campSpend = spendRecords.filter((r) => r.campaign_id === c.id).reduce((s, r) => s + Number(r.amount), 0)
                  const campBudget = budgets.filter((b) => b.campaign_id === c.id).reduce((s, b) => s + Number(b.total_budget), 0)
                  const pct = campBudget > 0 ? (campSpend / campBudget) * 100 : 0
                  const statusLabel = c.status === "active" ? "진행중" : c.status === "paused" ? "일시중지" : "종료"
                  return (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.channel}</td>
                      <td>{statusLabel}</td>
                      <td className="num">{formatCurrency(campSpend)}</td>
                      <td className="num">{campBudget > 0 ? formatCurrency(campBudget) : "—"}</td>
                      <td className="num">
                        {campBudget > 0 ? (
                          <span className="hbar">
                            <b style={{ width: `${Math.min(100, pct)}%`, background: pct > 90 ? "var(--bad)" : undefined }} />
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FooterBar />
    </>
  )
}
