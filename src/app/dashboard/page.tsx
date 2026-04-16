import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Topbar, FooterBar } from "@/components/console/Topbar"
import { Filters } from "@/components/console/Filters"
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils"

export default async function DashboardPage() {
  const h = await headers()
  const userId = h.get("x-user-id")
  const userName = decodeURIComponent(h.get("x-user-name") ?? "")
  const brandIdsHeader = h.get("x-user-brand-ids")
  const brandName = h.get("x-user-brand-name")
    ? decodeURIComponent(h.get("x-user-brand-name")!)
    : null

  if (!userId) redirect("/login")

  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []

  if (brandIds.length === 0) {
    return (
      <>
        <Topbar crumbs={[{ label: "워크스페이스" }, { label: "개요", strong: true }]} />
        <div className="canvas">
          <div className="panel">
            <div className="p-body" style={{ padding: 40, textAlign: "center", color: "var(--dim)" }}>
              연결된 브랜드가 없습니다. 담당자에게 문의하세요.
            </div>
          </div>
        </div>
      </>
    )
  }

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const monthEnd = now.toISOString().slice(0, 10)
  const weekEnd = new Date(now)
  weekEnd.setDate(now.getDate() + 7)
  const weekEndStr = weekEnd.toISOString().slice(0, 10)

  const supabase = await createClient()

  const [campaignsResult, activitiesResult, eventsResult, creativesResult, utmEntriesResult] = await Promise.all([
    supabase.from("campaigns").select("id, channel, name").in("brand_id", brandIds),
    supabase
      .from("activities")
      .select("id, title, content, channel, activity_date")
      .in("brand_id", brandIds)
      .order("activity_date", { ascending: false })
      .limit(6),
    supabase
      .from("calendar_events")
      .select("id, title, channel, event_date, status")
      .in("brand_id", brandIds)
      .gte("event_date", monthStart)
      .lte("event_date", weekEndStr)
      .order("event_date", { ascending: true })
      .limit(6),
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

  const spendRecords = (spendResult.data ?? []) as { campaign_id: string; amount: number }[]
  const budgetRecords = (budgetResult.data ?? []) as { campaign_id: string; total_budget: number }[]
  const perfRecords = (perfResult.data ?? []) as { campaign_id: string; values: Record<string, number> }[]
  const utmPerfRecords = (utmPerfResult.data ?? []) as {
    sessions: number
    users: number
    pageviews: number
    conversions: number
    revenue: number
  }[]

  const totalSpend = spendRecords.reduce((sum, r) => sum + Number(r.amount), 0)
  const totalBudget = budgetRecords.reduce((sum, b) => sum + Number(b.total_budget), 0)
  const budgetPercent = totalBudget > 0 ? Math.min(100, (totalSpend / totalBudget) * 100) : 0

  // Channel summaries
  const channelSet = new Set(campaigns.map((c) => c.channel))
  const channelSummaries = Array.from(channelSet).sort().map((channel) => {
    const chCampaignIds = campaigns.filter((c) => c.channel === channel).map((c) => c.id)
    const chSpend = spendRecords.filter((r) => chCampaignIds.includes(r.campaign_id)).reduce((s, r) => s + Number(r.amount), 0)
    const chBudget = budgetRecords.filter((b) => chCampaignIds.includes(b.campaign_id)).reduce((s, b) => s + Number(b.total_budget), 0)

    const chPerf = perfRecords.filter((r) => chCampaignIds.includes(r.campaign_id))
    const kpiTotals: Record<string, number> = {}
    for (const rec of chPerf) {
      for (const [k, v] of Object.entries(rec.values as Record<string, number>)) {
        kpiTotals[k] = (kpiTotals[k] ?? 0) + v
      }
    }

    return { channel, campaignCount: chCampaignIds.length, spend: chSpend, budget: chBudget, kpiTotals }
  })

  const ga4Totals = {
    sessions: utmPerfRecords.reduce((s, p) => s + (p.sessions ?? 0), 0),
    users: utmPerfRecords.reduce((s, p) => s + (p.users ?? 0), 0),
    pageviews: utmPerfRecords.reduce((s, p) => s + (p.pageviews ?? 0), 0),
    conversions: utmPerfRecords.reduce((s, p) => s + (p.conversions ?? 0), 0),
    revenue: utmPerfRecords.reduce((s, p) => s + Number(p.revenue ?? 0), 0),
  }

  const creativeStats = creativesResult.data ?? []
  const creativeCounts = {
    review_requested: creativeStats.filter((c) => c.status === "review_requested").length,
    feedback_pending: creativeStats.filter((c) => c.status === "feedback_pending").length,
    completed: creativeStats.filter((c) => c.status === "completed").length,
  }

  const activities = activitiesResult.data ?? []
  const upcomingEvents = eventsResult.data ?? []

  const monthLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01 — ${monthEnd}`
  const greeting = userName ? `${userName}님` : "안녕하세요"

  // KPI row
  const kpis = [
    {
      label: "캠페인",
      value: String(campaignIds.length),
      unit: "",
      hint: `${channelSummaries.length}개 채널`,
    },
    {
      label: "이번 달 지출",
      value: formatCurrency(totalSpend),
      unit: "",
      hint: totalBudget > 0 ? `예산 대비 ${budgetPercent.toFixed(0)}%` : "설정된 예산 없음",
    },
    {
      label: "예산 사용",
      value: totalBudget > 0 ? budgetPercent.toFixed(1) : "—",
      unit: totalBudget > 0 ? "%" : "",
      hint: totalBudget > 0 ? `잔여 ₩${formatNumber(totalBudget - totalSpend)}` : "예산 없음",
    },
    {
      label: "GA4 세션",
      value: formatNumber(ga4Totals.sessions),
      unit: "",
      hint: `${formatNumber(ga4Totals.users)} 사용자`,
    },
    {
      label: "전환수",
      value: formatNumber(ga4Totals.conversions),
      unit: "",
      hint: ga4Totals.revenue > 0 ? formatCurrency(ga4Totals.revenue) : "—",
    },
    {
      label: "소재",
      value: String(creativeStats.length),
      unit: "",
      hint: `리뷰 ${creativeCounts.review_requested} · 대기 ${creativeCounts.feedback_pending}`,
    },
  ]

  return (
    <>
      <Topbar
        crumbs={[
          { label: "워크스페이스" },
          { label: brandName ?? "브랜드" },
          { label: "개요", strong: true },
        ]}
      />

      <Filters />

      <div className="canvas">
        <div className="page-head">
          <div>
            <h1>
              성과 <em>개요</em>
            </h1>
            <div className="sub">
              {greeting} · {monthLabel} &nbsp; · &nbsp; {campaignIds.length}개 캠페인 &nbsp;
              <span className="live">운영중</span>
            </div>
          </div>
          <div className="pg-actions">
            <Link href="/dashboard/performance" className="btn">
              성과 보기 →
            </Link>
            <Link href="/dashboard/ga4" className="btn">
              GA4 UTM →
            </Link>
          </div>
        </div>

        {/* KPI row */}
        <div className="kpi-row">
          {kpis.map((k) => (
            <div key={k.label} className="kpi">
              <div className="top">
                <span>{k.label}</span>
              </div>
              <div className="v">
                {k.value}
                {k.unit && <span className="u">{k.unit}</span>}
              </div>
              <div className="d">
                <span>{k.hint}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Channel performance + Activity */}
        <div className="grid">
          <div className="panel">
            <div className="p-head">
              <h3>채널 성과</h3>
              <div className="sub">이번 달 · 지출 vs 예산</div>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "24%" }}>채널</th>
                    <th className="num">캠페인</th>
                    <th className="num">지출</th>
                    <th className="num">예산</th>
                    <th className="num">사용률</th>
                  </tr>
                </thead>
                <tbody>
                  {channelSummaries.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--dim)" }}>
                        등록된 캠페인이 없습니다.
                      </td>
                    </tr>
                  )}
                  {channelSummaries.map((cs) => {
                    const pct = cs.budget > 0 ? Math.min(100, (cs.spend / cs.budget) * 100) : 0
                    return (
                      <tr key={cs.channel}>
                        <td>
                          <Link
                            href={`/dashboard/performance?channel=${cs.channel}`}
                            style={{ color: "inherit" }}
                          >
                            {cs.channel}
                          </Link>
                        </td>
                        <td className="num">{cs.campaignCount}</td>
                        <td className="num">{formatCurrency(cs.spend)}</td>
                        <td className="num">{cs.budget > 0 ? formatCurrency(cs.budget) : "—"}</td>
                        <td className="num">
                          {cs.budget > 0 ? (
                            <span className="hbar">
                              <b style={{ width: `${pct}%`, background: pct > 90 ? "var(--bad)" : undefined }} />
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

          <div className="panel alerts">
            <div className="p-head">
              <h3>최근 운영현황</h3>
              <div className="sub">최근 6건</div>
            </div>
            <div className="p-body">
              {activities.length === 0 && (
                <div style={{ padding: 12, color: "var(--dim)", fontSize: 11 }}>
                  등록된 운영 현황이 없습니다.
                </div>
              )}
              {activities.map((a) => (
                <div key={a.id} className="alert info">
                  <div className="bullet" />
                  <div className="body">
                    <div className="top">
                      <span className="tag">{a.channel ?? "일반"}</span>
                      <span className="time">{formatDate(a.activity_date)}</span>
                    </div>
                    <div className="msg">{a.title}</div>
                    {a.content && <div className="meta">{a.content}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trio: Creatives · Upcoming · GA4 totals */}
        <div className="trio">
          <div className="panel">
            <div className="p-head">
              <h3>소재 현황</h3>
              <div className="sub">{creativeStats.length}건</div>
            </div>
            <div className="p-body">
              <StatRow label="리뷰 요청" value={creativeCounts.review_requested} />
              <StatRow label="피드백 대기" value={creativeCounts.feedback_pending} />
              <StatRow label="완료" value={creativeCounts.completed} />
              <div style={{ marginTop: 12 }}>
                <Link href="/dashboard/creatives" style={{ color: "var(--amber)", fontSize: 11 }}>
                  소재 보기 →
                </Link>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="p-head">
              <h3>예정 일정</h3>
              <div className="sub">7일 이내</div>
            </div>
            <div className="p-body">
              {upcomingEvents.length === 0 && (
                <div style={{ color: "var(--dim)", fontSize: 11 }}>예정된 일정 없음</div>
              )}
              {upcomingEvents.map((e) => (
                <div key={e.id} className="funnel-row">
                  <div className="n" style={{ fontSize: 11 }}>{formatDate(e.event_date)}</div>
                  <div className="l">
                    <div className="t">{e.title}</div>
                    <div className="s">
                      {e.channel ?? ""} {e.status ? `· ${e.status}` : ""}
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 8 }}>
                <Link href="/dashboard/calendar" style={{ color: "var(--amber)", fontSize: 11 }}>
                  캘린더 보기 →
                </Link>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="p-head">
              <h3>GA4 합계</h3>
              <div className="sub">{utmEntryIds.length} UTM · 이번 달</div>
            </div>
            <div className="p-body">
              <StatRow label="세션" value={formatNumber(ga4Totals.sessions)} />
              <StatRow label="사용자" value={formatNumber(ga4Totals.users)} />
              <StatRow label="페이지뷰" value={formatNumber(ga4Totals.pageviews)} />
              <StatRow label="전환수" value={formatNumber(ga4Totals.conversions)} />
              {ga4Totals.revenue > 0 && (
                <StatRow label="수익" value={formatCurrency(ga4Totals.revenue)} />
              )}
              <div style={{ marginTop: 12 }}>
                <Link href="/dashboard/ga4" style={{ color: "var(--amber)", fontSize: 11 }}>
                  GA4 보기 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FooterBar />
    </>
  )
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="dev-row">
      <span>◉</span>
      <span>{label}</span>
      <span>
        <b>{value}</b>
      </span>
    </div>
  )
}
