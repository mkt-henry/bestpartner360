import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils"
import { STATUS_LABELS } from "@/types"
import type { CalendarEventStatus } from "@/types"

const CHANNEL_INLINE: Record<string, string> = {
  Meta: "#1877F2", Instagram: "#E1306C", Facebook: "#1877F2",
  Google: "#4285F4", Naver: "#03c75a", Kakao: "#FEE500",
  TikTok: "#ff0040", YouTube: "#FF0000", GA4: "#FBBC05",
}

function channelTagClass(channel: string): string {
  const map: Record<string, string> = {
    Meta: "tag meta", Instagram: "tag instagram", Facebook: "tag facebook",
    Google: "tag google", Naver: "tag naver", Kakao: "tag kakao",
    TikTok: "tag tiktok", YouTube: "tag youtube", GA4: "tag ga4",
  }
  return map[channel] ?? "tag neutral"
}

function statusTagClass(status: string): string {
  const map: Record<string, string> = {
    planned: "tag neutral",
    in_progress: "tag warn",
    completed: "tag good",
    cancelled: "tag bad",
  }
  return map[status] ?? "tag neutral"
}

export default async function AdminViewerDashboardPage({
  params,
}: {
  params: Promise<{ brandId: string }>
}) {
  const { brandId } = await params
  const brandIds = [brandId]

  const supabase = await createClient()

  const { data: brand } = await supabase
    .from("brands")
    .select("name")
    .eq("id", brandId)
    .single()

  const brandName = brand?.name ?? "브랜드"

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const monthEnd = now.toISOString().slice(0, 10)
  const weekEnd = new Date(now)
  weekEnd.setDate(now.getDate() + 7)
  const weekEndStr = weekEnd.toISOString().slice(0, 10)

  const basePath = `/admin/viewer/${brandId}`

  const [campaignsResult, activitiesResult, eventsResult, creativesResult, utmEntriesResult] = await Promise.all([
    supabase.from("campaigns").select("id, channel").in("brand_id", brandIds),
    supabase
      .from("activities")
      .select("id, title, content, channel, activity_date")
      .in("brand_id", brandIds)
      .order("activity_date", { ascending: false })
      .limit(3),
    supabase
      .from("calendar_events")
      .select("id, title, channel, event_date, status")
      .in("brand_id", brandIds)
      .gte("event_date", monthStart)
      .lte("event_date", weekEndStr)
      .order("event_date", { ascending: true })
      .limit(5),
    supabase.from("creatives").select("status").in("brand_id", brandIds),
    supabase.from("ga4_utm_entries").select("id").in("brand_id", brandIds),
  ])

  const campaigns = campaignsResult.data ?? []
  const campaignIds = campaigns.map((c) => c.id)
  const utmEntryIds = utmEntriesResult.data?.map((e) => e.id) ?? []

  const [spendResult, budgetResult, perfResult, utmPerfResult] = await Promise.all([
    campaignIds.length > 0
      ? supabase.from("spend_records").select("campaign_id, amount").in("campaign_id", campaignIds).gte("spend_date", monthStart).lte("spend_date", monthEnd)
      : Promise.resolve({ data: [] }),
    campaignIds.length > 0
      ? supabase.from("budgets").select("campaign_id, total_budget").in("campaign_id", campaignIds).lte("period_start", monthEnd).gte("period_end", monthStart)
      : Promise.resolve({ data: [] }),
    campaignIds.length > 0
      ? supabase.from("performance_records").select("campaign_id, values").in("campaign_id", campaignIds).gte("record_date", monthStart).lte("record_date", monthEnd)
      : Promise.resolve({ data: [] }),
    utmEntryIds.length > 0
      ? supabase.from("ga4_utm_performance").select("sessions, users, pageviews, conversions, revenue").in("utm_entry_id", utmEntryIds).gte("record_date", monthStart).lte("record_date", monthEnd)
      : Promise.resolve({ data: [] }),
  ])

  const spendRecords = spendResult.data ?? []
  const budgetRecords = budgetResult.data ?? []
  const perfRecords = perfResult.data ?? []
  const utmPerfRecords = utmPerfResult.data ?? []

  const totalSpend = spendRecords.reduce((sum, r) => sum + Number(r.amount), 0)
  const totalBudget = budgetRecords.reduce((sum, b) => sum + Number(b.total_budget), 0)
  const budgetPercent = totalBudget > 0 ? Math.min(100, (totalSpend / totalBudget) * 100) : 0

  const channelSet = new Set(campaigns.map((c) => c.channel))
  const channelSummaries = Array.from(channelSet).sort().map((channel) => {
    const chCampaignIds = campaigns.filter((c) => c.channel === channel).map((c) => c.id)
    const chSpend = spendRecords.filter((r) => chCampaignIds.includes(r.campaign_id)).reduce((s, r) => s + Number(r.amount), 0)
    const chBudget = budgetRecords.filter((b) => chCampaignIds.includes(b.campaign_id)).reduce((s, b) => s + Number(b.total_budget), 0)
    const chCampaignCount = chCampaignIds.length
    const chPerf = perfRecords.filter((r) => chCampaignIds.includes(r.campaign_id))
    const kpiTotals: Record<string, number> = {}
    for (const rec of chPerf) {
      for (const [k, v] of Object.entries(rec.values as Record<string, number>)) {
        kpiTotals[k] = (kpiTotals[k] ?? 0) + v
      }
    }
    return { channel, campaignCount: chCampaignCount, spend: chSpend, budget: chBudget, kpiTotals }
  })

  const ga4Totals = {
    sessions: utmPerfRecords.reduce((s, p) => s + p.sessions, 0),
    users: utmPerfRecords.reduce((s, p) => s + p.users, 0),
    pageviews: utmPerfRecords.reduce((s, p) => s + p.pageviews, 0),
    conversions: utmPerfRecords.reduce((s, p) => s + p.conversions, 0),
    revenue: utmPerfRecords.reduce((s, p) => s + Number(p.revenue), 0),
  }
  const hasGa4Data = utmEntryIds.length > 0

  const creativeStats = creativesResult.data ?? []
  const creativeCounts = {
    review_requested: creativeStats.filter((c) => c.status === "review_requested").length,
    feedback_pending: creativeStats.filter((c) => c.status === "feedback_pending").length,
    completed: creativeStats.filter((c) => c.status === "completed").length,
  }

  const activities = activitiesResult.data
  const upcomingEvents = eventsResult.data

  return (
    <div className="canvas">
      {/* Header */}
      <div className="page-head">
        <div>
          <h1>{brandName} <em>대시보드</em></h1>
          <p className="sub">
            {now.getFullYear()}년 {now.getMonth() + 1}월 현황 · 파트너가 보는 화면입니다
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="card-grid cols-3">
        <Link href={`${basePath}/performance`} className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#7DB8D620", display: "grid", placeItems: "center",
              }}>
                <span style={{ color: "var(--steel)", fontSize: 14 }}>📊</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-2)" }}>성과 요약</span>
            </div>
            <span style={{ color: "var(--dim)", fontSize: 12 }}>→</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".1em" }}>이번 달 캠페인 수</span>
            <span style={{ fontFamily: "var(--c-serif)", fontSize: 28, fontVariationSettings: '"opsz" 144', color: "var(--text)" }}>{campaignIds.length}</span>
            <span style={{ fontSize: 10, color: "var(--dim)" }}>성과 상세 보기 →</span>
          </div>
        </Link>

        <Link href={`${basePath}/performance`} className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#5ec27a20", display: "grid", placeItems: "center",
              }}>
                <span style={{ color: "var(--good)", fontSize: 14 }}>💰</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-2)" }}>예산 현황</span>
            </div>
            <span style={{ color: "var(--dim)", fontSize: 12 }}>→</span>
          </div>
          {totalBudget > 0 ? (
            <>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--dim)", marginBottom: 6 }}>
                  <span>지출 {formatCurrency(totalSpend)}</span>
                  <span>{budgetPercent.toFixed(0)}%</span>
                </div>
                <div className="progress">
                  <b style={{ width: `${budgetPercent}%`, background: "var(--good)" }} />
                </div>
              </div>
              <span style={{ fontSize: 10, color: "var(--dim)" }}>
                총 예산 {formatCurrency(totalBudget)} · 잔여 {formatCurrency(totalBudget - totalSpend)}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 12, color: "var(--dim)", marginTop: 8 }}>예산 정보 없음</span>
          )}
        </Link>

        <Link href={`${basePath}/creatives`} className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#C77DD620", display: "grid", placeItems: "center",
              }}>
                <span style={{ color: "var(--plum)", fontSize: 14 }}>🖼</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-2)" }}>소재 현황</span>
            </div>
            <span style={{ color: "var(--dim)", fontSize: 12 }}>→</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: "var(--dim)" }}>검토 요청</span>
              <span style={{ fontWeight: 600, color: "var(--steel)" }}>{creativeCounts.review_requested}건</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: "var(--dim)" }}>피드백 대기</span>
              <span style={{ fontWeight: 600, color: "var(--amber)" }}>{creativeCounts.feedback_pending}건</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: "var(--dim)" }}>완료</span>
              <span style={{ fontWeight: 600, color: "var(--good)" }}>{creativeCounts.completed}건</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Channel Performance */}
      {(channelSummaries.length > 0 || hasGa4Data) && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--text)", fontWeight: 500 }}>매체별 성과</span>
            <Link href={`${basePath}/performance`} className="btn" style={{ padding: "4px 10px", fontSize: 10 }}>상세보기</Link>
          </div>
          <div className="card-grid cols-3">
            {channelSummaries.map((cs) => {
              const budgetPct = cs.budget > 0 ? Math.min(100, (cs.spend / cs.budget) * 100) : 0
              const kpiEntries = Object.entries(cs.kpiTotals).slice(0, 3)
              const dotColor = CHANNEL_INLINE[cs.channel] ?? "var(--dim)"
              return (
                <Link
                  key={cs.channel}
                  href={`${basePath}/performance?channel=${cs.channel}`}
                  className="card"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{cs.channel}</span>
                    <span style={{ fontSize: 10, color: "var(--dim)", marginLeft: "auto" }}>{cs.campaignCount}개 캠페인</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "var(--dim)" }}>이번 달 지출</span>
                      <span style={{ fontWeight: 600, color: dotColor }}>{formatCurrency(cs.spend)}</span>
                    </div>
                    {cs.budget > 0 && (
                      <>
                        <div className="progress">
                          <b style={{
                            width: `${budgetPct}%`,
                            background: budgetPct > 90 ? "var(--bad)" : budgetPct > 70 ? "var(--amber)" : "var(--good)",
                          }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--dim)" }}>
                          <span>예산 {formatCurrency(cs.budget)}</span>
                          <span>{budgetPct.toFixed(0)}%</span>
                        </div>
                      </>
                    )}
                  </div>
                  {kpiEntries.length > 0 && (
                    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {kpiEntries.map(([key, val]) => (
                        <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                          <span style={{ color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>{key}</span>
                          <span style={{ fontWeight: 500, color: "var(--text-2)" }}>{formatNumber(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Link>
              )
            })}

            {hasGa4Data && (
              <Link href={`${basePath}/ga4`} className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FBBC05", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>GA4</span>
                  <span style={{ fontSize: 10, color: "var(--dim)", marginLeft: "auto" }}>{utmEntryIds.length}개 UTM</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "var(--dim)" }}>세션</span>
                    <span style={{ fontWeight: 600, color: "var(--amber)" }}>{formatNumber(ga4Totals.sessions)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "var(--dim)" }}>사용자</span>
                    <span style={{ fontWeight: 500, color: "var(--text-2)" }}>{formatNumber(ga4Totals.users)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "var(--dim)" }}>페이지뷰</span>
                    <span style={{ fontWeight: 500, color: "var(--text-2)" }}>{formatNumber(ga4Totals.pageviews)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "var(--dim)" }}>전환수</span>
                    <span style={{ fontWeight: 500, color: "var(--text-2)" }}>{formatNumber(ga4Totals.conversions)}</span>
                  </div>
                  {ga4Totals.revenue > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "var(--dim)" }}>수익</span>
                      <span style={{ fontWeight: 500, color: "var(--text-2)" }}>{formatCurrency(ga4Totals.revenue)}</span>
                    </div>
                  )}
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Bottom Section */}
      <div className="card-grid cols-2">
        <div className="panel">
          <div className="p-head">
            <h3>최근 운영 현황</h3>
            <Link href={`${basePath}/activity`} className="btn" style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 10 }}>전체보기</Link>
          </div>
          <div className="p-body">
            {activities && activities.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {activities.map((a) => (
                  <div key={a.id} style={{ borderLeft: "2px solid var(--amber)", paddingLeft: 12 }}>
                    <p style={{ fontSize: 10, color: "var(--dim)", marginBottom: 2 }}>
                      {a.channel && <span style={{ fontWeight: 500, color: "var(--text-2)" }}>[{a.channel}]</span>}{" "}
                      {formatDate(a.activity_date)}
                    </p>
                    <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", lineHeight: 1.4 }}>{a.title}</p>
                    <p style={{ fontSize: 10, color: "var(--dim)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">운영 현황이 없습니다.</div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>예정 일정</h3>
            <Link href={`${basePath}/calendar`} className="btn" style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 10 }}>전체보기</Link>
          </div>
          <div className="p-body">
            {upcomingEvents && upcomingEvents.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {upcomingEvents.map((e) => (
                  <div key={e.id} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 10, color: "var(--dim)", width: 64, flexShrink: 0, paddingTop: 2, fontFamily: "var(--c-mono)" }}>{formatDate(e.event_date)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {e.channel && (
                          <span className={channelTagClass(e.channel)}>{e.channel}</span>
                        )}
                        <span className={statusTagClass(e.status)}>
                          {STATUS_LABELS[e.status as CalendarEventStatus]}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">예정된 일정이 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
