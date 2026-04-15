import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Topbar, FooterBar } from "./_components/Topbar"
import { Filters } from "./_components/Filters"
import { TabGroup } from "./_components/TabGroup"
import { createClient } from "@/lib/supabase/server"
import { formatNumber } from "@/lib/utils"
import { runGa4Report } from "@/lib/ga4-insights"

export const dynamic = "force-dynamic"

type PerfValues = Record<string, number>

function daysAgoISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function normalizeKey(s: string | null | undefined) {
  return (s ?? "").toLowerCase().replace(/[\s_\-·]+/g, "")
}

function channelIcon(channel: string): { ic: string; icLabel: string } {
  const c = channel.toLowerCase()
  if (c.includes("meta") || c.includes("facebook") || c.includes("instagram")) return { ic: "meta", icLabel: "M" }
  if (c.includes("google") || c.includes("ga")) return { ic: "goog", icLabel: "G" }
  if (c.includes("tiktok")) return { ic: "tiktok", icLabel: "T" }
  if (c.includes("naver")) return { ic: "goog", icLabel: "N" }
  if (c.includes("email") || c.includes("crm") || c.includes("lifecycle")) return { ic: "em", icLabel: "E" }
  return { ic: "org", icLabel: channel.slice(0, 1).toUpperCase() || "—" }
}

function formatWon(n: number): string {
  if (n >= 100000000) return `₩${(n / 100000000).toFixed(1)}억`
  if (n >= 10000000) return `₩${(n / 10000000).toFixed(1)}천만`
  if (n >= 10000) return `₩${Math.round(n / 10000).toLocaleString("ko-KR")}만`
  return `₩${Math.round(n).toLocaleString("ko-KR")}`
}

export default async function ConsoleOverviewPage() {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandIdsHeader = h.get("x-user-brand-ids")
  const brandName = h.get("x-user-brand-name")
    ? decodeURIComponent(h.get("x-user-brand-name")!)
    : null

  if (!userId) redirect("/login")

  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []

  if (brandIds.length === 0) {
    return (
      <>
        <Topbar crumbs={[{ label: "Workspace" }, { label: "Overview", strong: true }]} />
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

  const end = daysAgoISO(0)
  const start = daysAgoISO(13)
  const prevEnd = daysAgoISO(14)
  const prevStart = daysAgoISO(27)

  const supabase = await createClient()

  const [campaignsResult, utmEntriesResult, activitiesResult, ga4PropResult] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name, channel, status")
      .in("brand_id", brandIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("ga4_utm_entries")
      .select("id, utm_campaign, utm_source, utm_medium")
      .in("brand_id", brandIds),
    supabase
      .from("activities")
      .select("id, title, content, channel, activity_date")
      .in("brand_id", brandIds)
      .order("activity_date", { ascending: false })
      .limit(6),
    supabase
      .from("ga4_properties")
      .select("property_id")
      .in("brand_id", brandIds)
      .limit(1),
  ])

  const ga4Prop = ga4PropResult.data?.[0] ?? null

  const campaigns = (campaignsResult.data ?? []) as {
    id: string
    name: string
    channel: string
    status: string
  }[]
  const campaignIds = campaigns.map((c) => c.id)
  const utmEntries = (utmEntriesResult.data ?? []) as {
    id: string
    utm_campaign: string | null
    utm_source: string | null
    utm_medium: string | null
  }[]
  const utmEntryIds = utmEntries.map((e) => e.id)

  const [spendCurResult, spendPrevResult, perfCurResult, utmPerfCurResult, utmPerfPrevResult, budgetResult] = await Promise.all([
    campaignIds.length > 0
      ? supabase
          .from("spend_records")
          .select("campaign_id, spend_date, amount")
          .in("campaign_id", campaignIds)
          .gte("spend_date", start)
          .lte("spend_date", end)
      : Promise.resolve({ data: [] }),
    campaignIds.length > 0
      ? supabase
          .from("spend_records")
          .select("amount")
          .in("campaign_id", campaignIds)
          .gte("spend_date", prevStart)
          .lte("spend_date", prevEnd)
      : Promise.resolve({ data: [] }),
    campaignIds.length > 0
      ? supabase
          .from("performance_records")
          .select("campaign_id, values")
          .in("campaign_id", campaignIds)
          .gte("record_date", start)
          .lte("record_date", end)
      : Promise.resolve({ data: [] }),
    utmEntryIds.length > 0
      ? supabase
          .from("ga4_utm_performance")
          .select("utm_entry_id, record_date, sessions, conversions, revenue")
          .in("utm_entry_id", utmEntryIds)
          .gte("record_date", start)
          .lte("record_date", end)
      : Promise.resolve({ data: [] }),
    utmEntryIds.length > 0
      ? supabase
          .from("ga4_utm_performance")
          .select("sessions, conversions, revenue")
          .in("utm_entry_id", utmEntryIds)
          .gte("record_date", prevStart)
          .lte("record_date", prevEnd)
      : Promise.resolve({ data: [] }),
    campaignIds.length > 0
      ? supabase
          .from("budgets")
          .select("campaign_id, total_budget, period_start, period_end")
          .in("campaign_id", campaignIds)
          .lte("period_start", end)
          .gte("period_end", start)
      : Promise.resolve({ data: [] }),
  ])

  const spendCur = (spendCurResult.data ?? []) as { campaign_id: string; spend_date: string; amount: number }[]
  const spendPrev = (spendPrevResult.data ?? []) as { amount: number }[]
  const perfCur = (perfCurResult.data ?? []) as { campaign_id: string; values: PerfValues }[]
  const utmPerfCur = (utmPerfCurResult.data ?? []) as {
    utm_entry_id: string
    record_date: string
    sessions: number
    conversions: number
    revenue: number
  }[]
  const utmPerfPrev = (utmPerfPrevResult.data ?? []) as {
    sessions: number
    conversions: number
    revenue: number
  }[]
  const budgets = (budgetResult.data ?? []) as { campaign_id: string; total_budget: number }[]

  // Totals — current window
  const totalSpend = spendCur.reduce((s, r) => s + Number(r.amount), 0)
  const totalRevenue = utmPerfCur.reduce((s, r) => s + Number(r.revenue ?? 0), 0)
  const totalSessions = utmPerfCur.reduce((s, r) => s + (r.sessions ?? 0), 0)
  const totalConversions = utmPerfCur.reduce((s, r) => s + (r.conversions ?? 0), 0)
  const blendedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const cac = totalConversions > 0 ? totalSpend / totalConversions : 0
  const convRate = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0

  // Totals — previous window
  const prevSpend = spendPrev.reduce((s, r) => s + Number(r.amount), 0)
  const prevRevenue = utmPerfPrev.reduce((s, r) => s + Number(r.revenue ?? 0), 0)
  const prevSessions = utmPerfPrev.reduce((s, r) => s + (r.sessions ?? 0), 0)
  const prevConversions = utmPerfPrev.reduce((s, r) => s + (r.conversions ?? 0), 0)
  const prevRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0
  const prevCac = prevConversions > 0 ? prevSpend / prevConversions : 0
  const prevConvRate = prevSessions > 0 ? (prevConversions / prevSessions) * 100 : 0

  const pctDelta = (cur: number, prev: number) => {
    if (prev === 0) return cur === 0 ? 0 : 100
    return ((cur - prev) / prev) * 100
  }
  const fmtDelta = (d: number, suffix = "%") => `${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(1)}${suffix}`

  // Daily series for chart — 14 days
  const days: string[] = []
  for (let i = 13; i >= 0; i--) days.push(daysAgoISO(i))
  const spendByDay = new Map<string, number>(days.map((d) => [d, 0]))
  const revByDay = new Map<string, number>(days.map((d) => [d, 0]))
  for (const r of spendCur) {
    spendByDay.set(r.spend_date, (spendByDay.get(r.spend_date) ?? 0) + Number(r.amount))
  }
  for (const r of utmPerfCur) {
    revByDay.set(r.record_date, (revByDay.get(r.record_date) ?? 0) + Number(r.revenue ?? 0))
  }
  const dailySeries = days.map((d) => ({
    date: d,
    spend: spendByDay.get(d) ?? 0,
    revenue: revByDay.get(d) ?? 0,
  }))

  // Per-campaign aggregates
  const spendByCampaign = new Map<string, number>()
  for (const r of spendCur) {
    spendByCampaign.set(r.campaign_id, (spendByCampaign.get(r.campaign_id) ?? 0) + Number(r.amount))
  }
  const budgetByCampaign = new Map<string, number>()
  for (const b of budgets) {
    budgetByCampaign.set(b.campaign_id, (budgetByCampaign.get(b.campaign_id) ?? 0) + Number(b.total_budget))
  }
  const perfByCampaign = new Map<string, PerfValues>()
  for (const r of perfCur) {
    const agg = perfByCampaign.get(r.campaign_id) ?? {}
    for (const [k, v] of Object.entries(r.values ?? {})) {
      agg[k] = (agg[k] ?? 0) + Number(v)
    }
    perfByCampaign.set(r.campaign_id, agg)
  }

  // Match ga4 utm_campaign → campaign by normalized name
  const campaignByKey = new Map<string, string>()
  for (const c of campaigns) campaignByKey.set(normalizeKey(c.name), c.id)
  const campaignByUtmEntry = new Map<string, string>()
  for (const e of utmEntries) {
    const match = campaignByKey.get(normalizeKey(e.utm_campaign))
    if (match) campaignByUtmEntry.set(e.id, match)
  }
  const revByCampaign = new Map<string, number>()
  const convByCampaignUtm = new Map<string, number>()
  for (const r of utmPerfCur) {
    const cid = campaignByUtmEntry.get(r.utm_entry_id)
    if (!cid) continue
    revByCampaign.set(cid, (revByCampaign.get(cid) ?? 0) + Number(r.revenue ?? 0))
    convByCampaignUtm.set(cid, (convByCampaignUtm.get(cid) ?? 0) + (r.conversions ?? 0))
  }

  const campaignRows = campaigns
    .map((c) => {
      const spend = spendByCampaign.get(c.id) ?? 0
      const budget = budgetByCampaign.get(c.id) ?? 0
      const perf = perfByCampaign.get(c.id) ?? {}
      const revenue = revByCampaign.get(c.id) ?? 0
      const conv = convByCampaignUtm.get(c.id) ?? perf.conversions ?? 0
      const impressions = perf.impressions ?? 0
      const clicks = perf.clicks ?? 0
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
      const roas = spend > 0 && revenue > 0 ? revenue / spend : 0
      const cacRow = conv > 0 && spend > 0 ? spend / conv : 0
      const pacing = budget > 0 ? Math.min(100, (spend / budget) * 100) : null
      const { ic, icLabel } = channelIcon(c.channel)
      return {
        id: c.id,
        name: c.name,
        channel: c.channel,
        status: c.status,
        ic,
        icLabel,
        spend,
        revenue,
        conv,
        ctr,
        roas,
        cac: cacRow,
        pacing,
      }
    })
    .sort((a, b) => b.revenue - a.revenue || b.spend - a.spend)

  type OverviewDim = { label: string; sessions: number; users: number; revenue: number }
  let ga4Devices: OverviewDim[] = []
  let ga4Regions: OverviewDim[] = []
  let ga4Channels: OverviewDim[] = []
  type FunnelStep = { label: string; count: number }
  let ga4Funnel: FunnelStep[] = []

  if (ga4Prop) {
    const [devRes, regRes, chRes, funnelRes] = await Promise.all([
      runGa4Report({
        propertyId: ga4Prop.property_id,
        startDate: start,
        endDate: end,
        dimensions: ["deviceCategory"],
        metrics: ["sessions", "totalUsers", "totalRevenue"],
        orderByMetric: "sessions",
        limit: 10,
      }),
      runGa4Report({
        propertyId: ga4Prop.property_id,
        startDate: start,
        endDate: end,
        dimensions: ["city"],
        metrics: ["sessions", "totalUsers", "totalRevenue"],
        orderByMetric: "sessions",
        limit: 8,
      }),
      runGa4Report({
        propertyId: ga4Prop.property_id,
        startDate: start,
        endDate: end,
        dimensions: ["sessionDefaultChannelGroup"],
        metrics: ["sessions", "totalUsers", "totalRevenue"],
        orderByMetric: "sessions",
        limit: 10,
      }),
      runGa4Report({
        propertyId: ga4Prop.property_id,
        startDate: start,
        endDate: end,
        dimensions: ["eventName"],
        metrics: ["eventCount"],
        orderByMetric: "eventCount",
        limit: 200,
      }),
    ])
    const toDim = (res: typeof devRes): OverviewDim[] => {
      if ("error" in res) return []
      return res.rows.map((r) => ({
        label: r.dimensions[0] ?? "—",
        sessions: Number(r.metrics[0] ?? 0),
        users: Number(r.metrics[1] ?? 0),
        revenue: Number(r.metrics[2] ?? 0),
      }))
    }
    ga4Devices = toDim(devRes)
    ga4Regions = toDim(regRes)
    ga4Channels = toDim(chRes)

    if (!("error" in funnelRes)) {
      const eventCounts = new Map<string, number>()
      for (const row of funnelRes.rows) {
        const name = row.dimensions[0]
        if (!name) continue
        eventCounts.set(name, Number(row.metrics[0] ?? 0))
      }
      const steps: { key: string[]; label: string }[] = [
        { key: ["session_start"], label: "Sessions" },
        { key: ["view_item", "view_item_list"], label: "View item" },
        { key: ["add_to_cart"], label: "Add to cart" },
        { key: ["begin_checkout"], label: "Begin checkout" },
        { key: ["purchase"], label: "Purchase" },
      ]
      ga4Funnel = steps.map((s) => ({
        label: s.label,
        count: s.key.reduce((sum, k) => sum + (eventCounts.get(k) ?? 0), 0),
      }))
    }
  }

  const connectedSources = campaigns.length > 0 ? new Set(campaigns.map((c) => c.channel)).size : 0
  const rangeLabel = `${start} — ${end}`

  const activities = activitiesResult.data ?? []

  const kpis = [
    {
      label: "Revenue",
      value: formatWon(totalRevenue),
      chg: fmtDelta(pctDelta(totalRevenue, prevRevenue)),
      dir: totalRevenue >= prevRevenue ? "up" : "dn",
      vs: `vs ${formatWon(prevRevenue)}`,
      color: "#5EC27A",
    },
    {
      label: "Ad Spend",
      value: formatWon(totalSpend),
      chg: fmtDelta(pctDelta(totalSpend, prevSpend)),
      dir: totalSpend >= prevSpend ? "up" : "dn",
      vs: `vs ${formatWon(prevSpend)}`,
      color: "#E8B04B",
    },
    {
      label: "Blended ROAS",
      value: blendedRoas > 0 ? blendedRoas.toFixed(2) : "—",
      unit: blendedRoas > 0 ? "×" : "",
      chg: fmtDelta(blendedRoas - prevRoas, ""),
      dir: blendedRoas >= prevRoas ? "up" : "dn",
      vs: prevRoas > 0 ? `vs ${prevRoas.toFixed(2)}×` : "vs —",
      color: "#5EC27A",
    },
    {
      label: "CAC",
      value: cac > 0 ? formatWon(cac) : "—",
      chg: fmtDelta(pctDelta(cac, prevCac)),
      dir: cac <= prevCac ? "up" : "dn",
      vs: prevCac > 0 ? `vs ${formatWon(prevCac)}` : "vs —",
      color: "#5EC27A",
    },
    {
      label: "Sessions",
      value: formatNumber(totalSessions),
      chg: fmtDelta(pctDelta(totalSessions, prevSessions)),
      dir: totalSessions >= prevSessions ? "up" : "dn",
      vs: `vs ${formatNumber(prevSessions)}`,
      color: "#7DB8D6",
    },
    {
      label: "Conv. Rate",
      value: convRate > 0 ? convRate.toFixed(2) : "—",
      unit: convRate > 0 ? "%" : "",
      chg: fmtDelta(convRate - prevConvRate, "pp"),
      dir: convRate >= prevConvRate ? "up" : "dn",
      vs: prevConvRate > 0 ? `vs ${prevConvRate.toFixed(2)}%` : "vs —",
      color: "#E5553B",
    },
  ]

  return (
    <>
      <Topbar
        crumbs={[
          { label: "Workspace" },
          { label: brandName ?? "Brand" },
          { label: "Overview", strong: true },
        ]}
      />

      <Filters />

      <div className="canvas">
        <div className="page-head">
          <div>
            <h1>
              Performance <em>overview</em>
            </h1>
            <div className="sub">
              {rangeLabel} &nbsp; · &nbsp; {connectedSources} channels &nbsp;·&nbsp; {campaigns.length} campaigns{" "}
              <span className="live">live</span>
            </div>
          </div>
          <div className="pg-actions">
            <Link href="/dashboard/performance" className="btn">
              View performance →
            </Link>
            <Link href="/console/ga4" className="btn">
              GA4 →
            </Link>
          </div>
        </div>

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
                <span className={`chg ${k.dir}`}>{k.chg}</span>
                <span>{k.vs}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid">
          <div className="panel">
            <div className="p-head">
              <h3>Revenue vs Spend</h3>
              <div className="sub">{rangeLabel}</div>
              <TabGroup tabs={["Daily"]} initial="Daily" />
            </div>
            <div className="p-body">
              <div className="chart-stat">
                <div className="s">
                  <div className="l">
                    <i style={{ background: "#E8B04B" }} />
                    Revenue
                  </div>
                  <div className="v">{formatWon(totalRevenue)}</div>
                </div>
                <div className="s">
                  <div className="l">
                    <i style={{ background: "#7DB8D6" }} />
                    Spend
                  </div>
                  <div className="v">{formatWon(totalSpend)}</div>
                </div>
                <div className="s">
                  <div className="l">
                    <i style={{ background: "#5EC27A" }} />
                    Margin
                  </div>
                  <div className="v">{formatWon(totalRevenue - totalSpend)}</div>
                </div>
              </div>
              <div className="chart-wrap">
                <RevSpendChart series={dailySeries} />
              </div>
            </div>
          </div>

          <div className="panel alerts">
            <div className="p-head">
              <h3>Live activity</h3>
              <div className="sub">Last 6 updates</div>
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
                      <span className="tag">{a.channel ?? "General"}</span>
                      <span className="time">{a.activity_date}</span>
                    </div>
                    <div className="msg">{a.title}</div>
                    {a.content && <div className="meta">{a.content}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>Campaign Performance</h3>
            <div className="sub">
              {campaignRows.length} campaigns · sorted by revenue
            </div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "32%" }}>Campaign</th>
                  <th className="num">Spend</th>
                  <th className="num">Revenue</th>
                  <th className="num">ROAS</th>
                  <th className="num">CAC</th>
                  <th className="num">CTR</th>
                  <th className="num">Conv</th>
                  <th className="num">Pacing</th>
                </tr>
              </thead>
              <tbody>
                {campaignRows.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: "center", color: "var(--dim)" }}>
                      등록된 캠페인이 없습니다.
                    </td>
                  </tr>
                )}
                {campaignRows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="cell-main">
                        <div className={`ic ${c.ic}`}>{c.icLabel}</div>
                        <div>
                          <div>{c.name}</div>
                          <div className="cell-sub">
                            {c.channel} · {c.status}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="num">{c.spend > 0 ? formatWon(c.spend) : "—"}</td>
                    <td className="num">{c.revenue > 0 ? formatWon(c.revenue) : "—"}</td>
                    <td className="num">{c.roas > 0 ? `${c.roas.toFixed(2)}×` : "—"}</td>
                    <td className="num">{c.cac > 0 ? formatWon(c.cac) : "—"}</td>
                    <td className="num">{c.ctr > 0 ? `${c.ctr.toFixed(2)}%` : "—"}</td>
                    <td className="num">{c.conv > 0 ? formatNumber(c.conv) : "—"}</td>
                    <td className="num">
                      {c.pacing !== null ? (
                        <span className="hbar">
                          <b style={{ width: `${c.pacing}%`, background: c.pacing > 90 ? "var(--bad)" : undefined }} />
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="trio">
          <div className="panel">
            <div className="p-head">
              <h3>Conversion Funnel</h3>
              <div className="sub">GA4 eventCount · {rangeLabel}</div>
            </div>
            <div className="p-body">
              {!ga4Prop && (
                <div style={{ padding: 16, color: "var(--dim)", fontSize: 11 }}>
                  GA4 Property 미연결
                </div>
              )}
              {ga4Prop && ga4Funnel.every((s) => s.count === 0) && (
                <div style={{ padding: 16, color: "var(--dim)", fontSize: 11 }}>
                  이벤트 데이터 없음
                </div>
              )}
              {ga4Prop && ga4Funnel.some((s) => s.count > 0) && (() => {
                const maxCount = Math.max(1, ...ga4Funnel.map((s) => s.count))
                const firstCount = ga4Funnel[0]?.count ?? 0
                return (
                  <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {ga4Funnel.map((s, i) => {
                      const prev = i > 0 ? ga4Funnel[i - 1].count : firstCount
                      const step = prev > 0 ? (s.count / prev) * 100 : 0
                      const total = firstCount > 0 ? (s.count / firstCount) * 100 : 0
                      return (
                        <div key={s.label}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                            <span>{s.label}</span>
                            <span>
                              <b>{formatNumber(s.count)}</b>
                              <span className="pct"> {total.toFixed(0)}%</span>
                              {i > 0 && <span className="pct"> · step {step.toFixed(0)}%</span>}
                            </span>
                          </div>
                          <span className="hbar">
                            <b style={{ width: `${(s.count / maxCount) * 100}%` }} />
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </div>

          <div className="panel">
            <div className="p-head">
              <h3>Top Regions</h3>
              <div className="sub">GA4 city · sessions 상위</div>
            </div>
            <div className="p-body">
              {!ga4Prop && (
                <div style={{ padding: 16, color: "var(--dim)", fontSize: 11 }}>
                  GA4 Property 미연결
                </div>
              )}
              {ga4Prop && ga4Regions.length === 0 && (
                <div style={{ padding: 16, color: "var(--dim)", fontSize: 11 }}>
                  데이터 없음
                </div>
              )}
              {ga4Regions.map((r) => (
                <div key={r.label} className="geo-row">
                  <span>{r.label}</span>
                  <span />
                  <span>
                    <b className="v">{formatNumber(r.sessions)}</b>
                    <span className="pct">{r.revenue > 0 ? formatWon(r.revenue) : "—"}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="p-head">
              <h3>Devices &amp; Channels</h3>
              <div className="sub">GA4 deviceCategory · channelGroup</div>
            </div>
            <div className="p-body">
              {!ga4Prop && (
                <div style={{ padding: 16, color: "var(--dim)", fontSize: 11 }}>
                  GA4 Property 미연결
                </div>
              )}
              {ga4Prop && (
                <>
                  <div style={{ padding: "8px 12px 4px", fontSize: 10, color: "var(--dim)" }}>
                    Devices
                  </div>
                  {ga4Devices.length === 0 && (
                    <div style={{ padding: 8, color: "var(--dim)", fontSize: 11 }}>데이터 없음</div>
                  )}
                  {ga4Devices.map((d) => (
                    <div key={`dev-${d.label}`} className="geo-row">
                      <span>{d.label}</span>
                      <span />
                      <span>
                        <b className="v">{formatNumber(d.sessions)}</b>
                      </span>
                    </div>
                  ))}
                  <div style={{ padding: "10px 12px 4px", fontSize: 10, color: "var(--dim)" }}>
                    Channels
                  </div>
                  {ga4Channels.length === 0 && (
                    <div style={{ padding: 8, color: "var(--dim)", fontSize: 11 }}>데이터 없음</div>
                  )}
                  {ga4Channels.slice(0, 6).map((c) => (
                    <div key={`ch-${c.label}`} className="geo-row">
                      <span>{c.label}</span>
                      <span />
                      <span>
                        <b className="v">{formatNumber(c.sessions)}</b>
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <FooterBar />
    </>
  )
}

function RevSpendChart({ series }: { series: { date: string; spend: number; revenue: number }[] }) {
  const W = 700
  const H = 260
  const padL = 40
  const padR = 10
  const padT = 20
  const padB = 30

  const maxVal = Math.max(1, ...series.map((d) => Math.max(d.revenue, d.spend)))
  const xAt = (i: number) => {
    if (series.length <= 1) return padL
    return padL + ((W - padL - padR) * i) / (series.length - 1)
  }
  const yAt = (v: number) => H - padB - ((H - padT - padB) * v) / maxVal

  const revPath = series.map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(d.revenue)}`).join(" ")
  const spendPath = series.map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(d.spend)}`).join(" ")
  const revArea = series.length > 0
    ? `${revPath} L${xAt(series.length - 1)},${H - padB} L${xAt(0)},${H - padB} Z`
    : ""

  const yTicks = [0.25, 0.5, 0.75, 1].map((f) => Math.round(maxVal * f))
  const firstLabel = series[0]?.date.slice(5) ?? ""
  const midLabel = series[Math.floor(series.length / 2)]?.date.slice(5) ?? ""
  const lastLabel = series[series.length - 1]?.date.slice(5) ?? ""

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#E8B04B" stopOpacity=".4" />
          <stop offset="1" stopColor="#E8B04B" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line className="grid-line" x1={padL} x2={W - padR} y1={yAt(t)} y2={yAt(t)} />
          <text className="y-label" x="0" y={yAt(t) + 4}>
            {formatWon(t)}
          </text>
        </g>
      ))}
      {revArea && <path d={revArea} fill="url(#rev)" />}
      {revPath && <path d={revPath} fill="none" stroke="#E8B04B" strokeWidth="1.8" />}
      {spendPath && (
        <path d={spendPath} fill="none" stroke="#7DB8D6" strokeWidth="1.5" strokeDasharray="4 3" />
      )}
      <g fill="#E8B04B">
        {series.map((d, i) => (
          <circle key={i} cx={xAt(i)} cy={yAt(d.revenue)} r="2" />
        ))}
      </g>
      <text className="x-label" x={padL} y={H - 8}>
        {firstLabel}
      </text>
      <text className="x-label" x={xAt(Math.floor(series.length / 2))} y={H - 8}>
        {midLabel}
      </text>
      <text className="x-label" x={W - padR} y={H - 8} textAnchor="end">
        {lastLabel}
      </text>
    </svg>
  )
}
