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
  const CHANNEL_DOT_COLORS: Record<string, string> = {
    Meta: "#2563eb", Instagram: "#e91e90", Facebook: "#1877f2",
    Google: "#f59e0b", Naver: "#10b981", Kakao: "#fbbf24",
    TikTok: "#64748b", YouTube: "#ef4444", GA4: "#f97316",
  }

  return (
    <div className="canvas" style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--c-serif)', fontSize: 20, fontWeight: 700,
          color: 'var(--text)', margin: 0,
        }}>
          성과 현황
          {selectedChannel && (
            <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--dim)', marginLeft: 8 }}>
              · {selectedChannel}
            </span>
          )}
        </h1>
      </div>

      {channels.length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <ChannelTabs channels={channels} currentChannel={selectedChannel ?? null} basePath={`/admin/viewer/${brandId}/performance`} />
        </div>
      )}

      {channelSummaries && channelSummaries.length > 0 && (
        <div className="card-grid cols-4" style={{ marginBottom: 24 }}>
          {channelSummaries.map((cs) => (
            <div
              key={cs.channel}
              className="panel"
              style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 8, padding: 16 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: CHANNEL_DOT_COLORS[cs.channel] ?? 'var(--dim)',
                  display: 'inline-block',
                }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{cs.channel}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--dim)' }}>캠페인</span>
                  <span style={{ fontWeight: 500, color: 'var(--text)' }}>{cs.campaignCount}개</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--dim)' }}>지출</span>
                  <span style={{ fontWeight: 500, color: 'var(--text)' }}>{formatCurrency(cs.spend)}</span>
                </div>
                {cs.budget > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--dim)' }}>예산</span>
                    <span style={{ fontWeight: 500, color: 'var(--text)' }}>{formatCurrency(cs.budget)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {uniqueKpiDefs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--dim)', marginBottom: 12 }}>KPI 지표</h2>
          <div className="card-grid cols-4">
            {uniqueKpiDefs.map((def) => {
              const total = kpiTotals[def.metric_key] ?? 0
              const formatted = def.unit === "원" ? formatCurrency(total) : formatNumber(total)
              return <KpiCard key={def.metric_key} label={def.label} value={formatted} unit={def.unit !== "원" ? def.unit : undefined} />
            })}
          </div>
        </div>
      )}

      {uniqueKpiDefs.length > 0 && kpiChartData.length > 1 && (
        <div
          className="panel"
          style={{
            background: 'var(--bg-1)', border: '1px solid var(--line)',
            borderRadius: 8, padding: 20, marginBottom: 24,
          }}
        >
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 16px' }}>KPI 추이</h3>
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

      <div
        className="panel"
        style={{
          background: 'var(--bg-1)', border: '1px solid var(--line)',
          borderRadius: 8, padding: 20, marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 20px' }}>예산 현황</h3>
        {totalBudget > 0 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--dim)', margin: '0 0 4px' }}>총 예산</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{formatCurrency(totalBudget)}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--dim)', margin: '0 0 4px' }}>누적 지출</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{formatCurrency(totalSpend)}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--dim)', margin: '0 0 4px' }}>잔여 예산</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--good)', margin: 0 }}>{formatCurrency(totalBudget - totalSpend)}</p>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--dim)', marginBottom: 6 }}>
                <span>지출률</span>
                <span style={{ fontWeight: 600 }}>{budgetPercent.toFixed(1)}%</span>
              </div>
              <div className="progress">
                <b style={{
                  width: `${budgetPercent}%`,
                  background: budgetPercent > 90 ? 'var(--bad)' : budgetPercent > 70 ? 'var(--amber)' : 'var(--good)',
                }} />
              </div>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--dim)' }}>등록된 예산 정보가 없습니다.</p>
        )}
        {spendChartArr.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--dim)', marginBottom: 12 }}>일별 지출</p>
            <SpendBarChart data={spendChartArr} />
          </div>
        )}
      </div>

      <div
        className="panel"
        style={{
          background: 'var(--bg-1)', border: '1px solid var(--line)',
          borderRadius: 8, padding: 20,
        }}
      >
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 16px' }}>캠페인 현황</h3>
        {campaigns.length > 0 ? (
          <div>
            {campaigns.map((c, idx) => {
              const campSpend = spendRecords.filter((r) => r.campaign_id === c.id).reduce((s, r) => s + Number(r.amount), 0)
              const campBudget = budgets.filter((b) => b.campaign_id === c.id).reduce((s, b) => s + Number(b.total_budget), 0)
              const pct = campBudget > 0 ? (campSpend / campBudget) * 100 : 0
              return (
                <div
                  key={c.id}
                  style={{
                    padding: '12px 0',
                    borderTop: idx > 0 ? '1px solid var(--line)' : undefined,
                    display: 'flex', alignItems: 'center', gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="tag neutral">{c.channel}</span>
                      <span style={{
                        fontSize: 13, fontWeight: 500, color: 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {c.name}
                      </span>
                      <span
                        className={`tag ${c.status === "active" ? "good" : c.status === "paused" ? "warn" : "neutral"}`}
                        style={{ marginLeft: 'auto', flexShrink: 0 }}
                      >
                        {c.status === "active" ? "진행중" : c.status === "paused" ? "일시중지" : "종료"}
                      </span>
                    </div>
                    {campBudget > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--dim)', marginBottom: 4 }}>
                          <span>{formatCurrency(campSpend)} 지출</span>
                          <span>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="progress" style={{ height: 4 }}>
                          <b style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--dim)' }}>
            {selectedChannel ? `${selectedChannel} 채널에 해당하는 캠페인이 없습니다.` : "캠페인이 없습니다."}
          </p>
        )}
      </div>
    </div>
  )
}
