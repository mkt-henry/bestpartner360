import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Topbar, FooterBar } from "../_components/Topbar"
import { createClient } from "@/lib/supabase/server"
import { formatNumber } from "@/lib/utils"
import { runGa4Report } from "@/lib/ga4-insights"

export const dynamic = "force-dynamic"

function daysAgoISO(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function formatWon(n: number): string {
  if (n >= 100000000) return `₩${(n / 100000000).toFixed(2)}억`
  if (n >= 10000000) return `₩${(n / 10000000).toFixed(1)}천만`
  if (n >= 10000) return `₩${Math.round(n / 10000).toLocaleString("ko-KR")}만`
  return `₩${Math.round(n).toLocaleString("ko-KR")}`
}

export default async function ConsoleGa4Page() {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandIdsHeader = h.get("x-user-brand-ids")
  const brandName = h.get("x-user-brand-name")
    ? decodeURIComponent(h.get("x-user-brand-name")!)
    : "Brand"

  if (!userId) redirect("/login")
  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []

  if (brandIds.length === 0) {
    return (
      <>
        <Topbar
          crumbs={[
            { label: "Workspace" },
            { label: brandName },
            { label: "GA4 Analytics", strong: true },
          ]}
        />
        <div className="canvas">
          <div className="panel">
            <div className="p-body" style={{ padding: 40, textAlign: "center", color: "var(--dim)" }}>
              연결된 브랜드가 없습니다.
            </div>
          </div>
        </div>
        <FooterBar />
      </>
    )
  }

  const since = daysAgoISO(13)
  const until = daysAgoISO(0)
  const prevSince = daysAgoISO(27)
  const prevUntil = daysAgoISO(14)

  const supabase = await createClient()
  const { data: utmEntries } = await supabase
    .from("ga4_utm_entries")
    .select("id, label, landing_url, utm_source, utm_medium, utm_campaign")
    .in("brand_id", brandIds)
    .order("created_at", { ascending: false })

  const entries = utmEntries ?? []
  const entryIds = entries.map((e) => e.id)

  const [curResult, prevResult, ga4PropResult] = await Promise.all([
    entryIds.length > 0
      ? supabase
          .from("ga4_utm_performance")
          .select("utm_entry_id, sessions, users, pageviews, conversions, revenue, bounce_rate, avg_session_duration")
          .in("utm_entry_id", entryIds)
          .gte("record_date", since)
          .lte("record_date", until)
      : Promise.resolve({ data: [] }),
    entryIds.length > 0
      ? supabase
          .from("ga4_utm_performance")
          .select("sessions, users, pageviews, conversions, revenue")
          .in("utm_entry_id", entryIds)
          .gte("record_date", prevSince)
          .lte("record_date", prevUntil)
      : Promise.resolve({ data: [] }),
    supabase
      .from("ga4_properties")
      .select("property_id, website_url")
      .in("brand_id", brandIds)
      .limit(1),
  ])

  const cur = (curResult.data ?? []) as {
    utm_entry_id: string
    sessions: number
    users: number
    pageviews: number
    conversions: number
    revenue: number
    bounce_rate: number | null
    avg_session_duration: number | null
  }[]
  const prev = (prevResult.data ?? []) as {
    sessions: number
    users: number
    pageviews: number
    conversions: number
    revenue: number
  }[]
  const prop = ga4PropResult.data?.[0] ?? null

  type Ga4Panel = { label: string; metrics: Record<string, number> }[]
  let acquisition: Ga4Panel = []
  let topPages: Ga4Panel = []
  let devices: Ga4Panel = []
  let channels: Ga4Panel = []
  let regions: Ga4Panel = []
  let ga4PropError: string | null = null

  if (prop) {
    const [acqRes, pagesRes, devRes, chRes, regRes] = await Promise.all([
      runGa4Report({
        propertyId: prop.property_id,
        startDate: since,
        endDate: until,
        dimensions: ["sessionSourceMedium"],
        metrics: ["sessions", "totalUsers", "conversions", "totalRevenue"],
        orderByMetric: "sessions",
        limit: 20,
      }),
      runGa4Report({
        propertyId: prop.property_id,
        startDate: since,
        endDate: until,
        dimensions: ["pagePath"],
        metrics: ["screenPageViews", "totalUsers", "averageSessionDuration"],
        orderByMetric: "screenPageViews",
        limit: 15,
      }),
      runGa4Report({
        propertyId: prop.property_id,
        startDate: since,
        endDate: until,
        dimensions: ["deviceCategory"],
        metrics: ["sessions", "totalUsers", "conversions"],
        orderByMetric: "sessions",
        limit: 10,
      }),
      runGa4Report({
        propertyId: prop.property_id,
        startDate: since,
        endDate: until,
        dimensions: ["sessionDefaultChannelGroup"],
        metrics: ["sessions", "totalUsers", "conversions", "totalRevenue"],
        orderByMetric: "sessions",
        limit: 15,
      }),
      runGa4Report({
        propertyId: prop.property_id,
        startDate: since,
        endDate: until,
        dimensions: ["city"],
        metrics: ["sessions", "totalUsers"],
        orderByMetric: "sessions",
        limit: 12,
      }),
    ])

    const toPanel = (res: typeof acqRes, metricNames: string[]): Ga4Panel => {
      if ("error" in res) {
        ga4PropError = res.error
        return []
      }
      return res.rows.map((row) => {
        const metrics: Record<string, number> = {}
        metricNames.forEach((name, i) => {
          metrics[name] = Number(row.metrics[i] ?? 0)
        })
        return { label: row.dimensions[0] ?? "—", metrics }
      })
    }

    acquisition = toPanel(acqRes, ["sessions", "users", "conversions", "revenue"])
    topPages = toPanel(pagesRes, ["pageviews", "users", "avgDuration"])
    devices = toPanel(devRes, ["sessions", "users", "conversions"])
    channels = toPanel(chRes, ["sessions", "users", "conversions", "revenue"])
    regions = toPanel(regRes, ["sessions", "users"])
  }

  const totals = {
    sessions: cur.reduce((s, r) => s + (r.sessions ?? 0), 0),
    users: cur.reduce((s, r) => s + (r.users ?? 0), 0),
    pageviews: cur.reduce((s, r) => s + (r.pageviews ?? 0), 0),
    conversions: cur.reduce((s, r) => s + (r.conversions ?? 0), 0),
    revenue: cur.reduce((s, r) => s + Number(r.revenue ?? 0), 0),
  }
  const prevTotals = {
    sessions: prev.reduce((s, r) => s + (r.sessions ?? 0), 0),
    users: prev.reduce((s, r) => s + (r.users ?? 0), 0),
    pageviews: prev.reduce((s, r) => s + (r.pageviews ?? 0), 0),
    conversions: prev.reduce((s, r) => s + (r.conversions ?? 0), 0),
    revenue: prev.reduce((s, r) => s + Number(r.revenue ?? 0), 0),
  }

  const pct = (c: number, p: number) => {
    if (p === 0) return c === 0 ? 0 : 100
    return ((c - p) / p) * 100
  }
  const fmtDelta = (d: number) => `${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(1)}%`

  const convRate = totals.sessions > 0 ? (totals.conversions / totals.sessions) * 100 : 0
  const prevConvRate = prevTotals.sessions > 0 ? (prevTotals.conversions / prevTotals.sessions) * 100 : 0

  // Per-UTM aggregation
  const byEntry = new Map<
    string,
    { sessions: number; users: number; pageviews: number; conversions: number; revenue: number }
  >()
  for (const r of cur) {
    const agg = byEntry.get(r.utm_entry_id) ?? {
      sessions: 0,
      users: 0,
      pageviews: 0,
      conversions: 0,
      revenue: 0,
    }
    agg.sessions += r.sessions ?? 0
    agg.users += r.users ?? 0
    agg.pageviews += r.pageviews ?? 0
    agg.conversions += r.conversions ?? 0
    agg.revenue += Number(r.revenue ?? 0)
    byEntry.set(r.utm_entry_id, agg)
  }
  const entryRows = entries
    .map((e) => ({
      ...e,
      stats: byEntry.get(e.id) ?? { sessions: 0, users: 0, pageviews: 0, conversions: 0, revenue: 0 },
    }))
    .sort((a, b) => b.stats.sessions - a.stats.sessions)

  const kpis = [
    {
      label: "Sessions",
      value: formatNumber(totals.sessions),
      chg: fmtDelta(pct(totals.sessions, prevTotals.sessions)),
      dir: totals.sessions >= prevTotals.sessions ? "up" : "dn",
      vs: `vs ${formatNumber(prevTotals.sessions)}`,
    },
    {
      label: "Users",
      value: formatNumber(totals.users),
      chg: fmtDelta(pct(totals.users, prevTotals.users)),
      dir: totals.users >= prevTotals.users ? "up" : "dn",
      vs: `vs ${formatNumber(prevTotals.users)}`,
    },
    {
      label: "Pageviews",
      value: formatNumber(totals.pageviews),
      chg: fmtDelta(pct(totals.pageviews, prevTotals.pageviews)),
      dir: totals.pageviews >= prevTotals.pageviews ? "up" : "dn",
      vs: `vs ${formatNumber(prevTotals.pageviews)}`,
    },
    {
      label: "Conversions",
      value: formatNumber(totals.conversions),
      chg: fmtDelta(pct(totals.conversions, prevTotals.conversions)),
      dir: totals.conversions >= prevTotals.conversions ? "up" : "dn",
      vs: `vs ${formatNumber(prevTotals.conversions)}`,
    },
    {
      label: "Conv. Rate",
      value: convRate > 0 ? convRate.toFixed(2) : "—",
      unit: convRate > 0 ? "%" : "",
      chg: `${convRate - prevConvRate >= 0 ? "▲" : "▼"} ${Math.abs(convRate - prevConvRate).toFixed(2)}pp`,
      dir: convRate >= prevConvRate ? "up" : "dn",
      vs: prevConvRate > 0 ? `vs ${prevConvRate.toFixed(2)}%` : "vs —",
    },
    {
      label: "Revenue",
      value: totals.revenue > 0 ? formatWon(totals.revenue) : "—",
      chg: fmtDelta(pct(totals.revenue, prevTotals.revenue)),
      dir: totals.revenue >= prevTotals.revenue ? "up" : "dn",
      vs: prevTotals.revenue > 0 ? `vs ${formatWon(prevTotals.revenue)}` : "vs —",
    },
  ]

  const rangeLabel = `${since} — ${until}`

  return (
    <>
      <Topbar
        crumbs={[
          { label: "Workspace" },
          { label: brandName },
          { label: "GA4 Analytics", strong: true },
        ]}
      />
      <div className="detail-head">
        <Link className="back-link" href="/console">
          ← Back to Overview
        </Link>
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic">Ω</span>
              <span>
                Google Analytics 4
                {prop ? ` · ${prop.website_url ?? ""} · Property ${prop.property_id}` : " · (property 미연결)"}
              </span>
            </div>
            <h1>
              UTM <em>performance</em>
            </h1>
            <div className="dh-meta">
              <span className="live-pill">Last 14 days</span>
              <span>{rangeLabel}</span>
              <span>·</span>
              <span>
                Compared vs <b>previous 14 days</b>
              </span>
              <span>·</span>
              <span>
                {entries.length} UTM entries · {entryRows.filter((r) => r.stats.sessions > 0).length} active
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="canvas">
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

        <div className="panel">
          <div className="p-head">
            <h3>UTM Performance</h3>
            <div className="sub">
              {entryRows.length} entries · sorted by sessions
            </div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Entry</th>
                  <th>Source / Medium</th>
                  <th>Campaign</th>
                  <th className="num">Sessions</th>
                  <th className="num">Users</th>
                  <th className="num">Pageviews</th>
                  <th className="num">Conv</th>
                  <th className="num">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {entryRows.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: "center", color: "var(--dim)" }}>
                      등록된 UTM 엔트리가 없습니다.
                    </td>
                  </tr>
                )}
                {entryRows.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="cell-main">
                        <div>
                          <div>{e.label}</div>
                          {e.landing_url && <div className="cell-sub">{e.landing_url}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <code>
                        {e.utm_source} / {e.utm_medium}
                      </code>
                    </td>
                    <td>
                      <code>{e.utm_campaign ?? "—"}</code>
                    </td>
                    <td className="num">{formatNumber(e.stats.sessions)}</td>
                    <td className="num">{formatNumber(e.stats.users)}</td>
                    <td className="num">{formatNumber(e.stats.pageviews)}</td>
                    <td className="num">{formatNumber(e.stats.conversions)}</td>
                    <td className="num">{e.stats.revenue > 0 ? formatWon(e.stats.revenue) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {!prop && (
          <div className="panel">
            <div className="p-body" style={{ padding: 24, color: "var(--dim)", fontSize: 12 }}>
              GA4 Property가 연결되지 않아 속성 단위 리포트(Acquisition / Devices / Channels)를 표시할 수 없습니다.
            </div>
          </div>
        )}
        {prop && ga4PropError && (
          <div className="panel">
            <div className="p-body" style={{ padding: 16, color: "var(--dim)", fontSize: 11 }}>
              GA4 Data API 오류: {ga4PropError}
            </div>
          </div>
        )}

        {prop && (
          <div className="trio">
            <div className="panel">
              <div className="p-head">
                <h3>Acquisition</h3>
                <div className="sub">Source / Medium · sessions 기준 상위</div>
              </div>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Source / Medium</th>
                      <th className="num">Sessions</th>
                      <th className="num">Users</th>
                      <th className="num">Conv</th>
                      <th className="num">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acquisition.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "var(--dim)" }}>
                          데이터 없음
                        </td>
                      </tr>
                    )}
                    {acquisition.map((r) => (
                      <tr key={r.label}>
                        <td>
                          <code>{r.label}</code>
                        </td>
                        <td className="num">{formatNumber(r.metrics.sessions)}</td>
                        <td className="num">{formatNumber(r.metrics.users)}</td>
                        <td className="num">{formatNumber(r.metrics.conversions)}</td>
                        <td className="num">{r.metrics.revenue > 0 ? formatWon(r.metrics.revenue) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <div className="p-head">
                <h3>Top Pages</h3>
                <div className="sub">Page path · pageviews 기준 상위</div>
              </div>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Page path</th>
                      <th className="num">Views</th>
                      <th className="num">Users</th>
                      <th className="num">Avg. dur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPages.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: 16, textAlign: "center", color: "var(--dim)" }}>
                          데이터 없음
                        </td>
                      </tr>
                    )}
                    {topPages.map((r) => (
                      <tr key={r.label}>
                        <td>
                          <code>{r.label}</code>
                        </td>
                        <td className="num">{formatNumber(r.metrics.pageviews)}</td>
                        <td className="num">{formatNumber(r.metrics.users)}</td>
                        <td className="num">{Math.round(r.metrics.avgDuration)}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <div className="p-head">
                <h3>Devices</h3>
                <div className="sub">Device category</div>
              </div>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th className="num">Sessions</th>
                      <th className="num">Users</th>
                      <th className="num">Conv</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: 16, textAlign: "center", color: "var(--dim)" }}>
                          데이터 없음
                        </td>
                      </tr>
                    )}
                    {devices.map((r) => (
                      <tr key={r.label}>
                        <td>{r.label}</td>
                        <td className="num">{formatNumber(r.metrics.sessions)}</td>
                        <td className="num">{formatNumber(r.metrics.users)}</td>
                        <td className="num">{formatNumber(r.metrics.conversions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {prop && (
          <div className="two">
            <div className="panel">
              <div className="p-head">
                <h3>Channels</h3>
                <div className="sub">Default channel grouping</div>
              </div>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th className="num">Sessions</th>
                      <th className="num">Users</th>
                      <th className="num">Conv</th>
                      <th className="num">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "var(--dim)" }}>
                          데이터 없음
                        </td>
                      </tr>
                    )}
                    {channels.map((r) => (
                      <tr key={r.label}>
                        <td>{r.label}</td>
                        <td className="num">{formatNumber(r.metrics.sessions)}</td>
                        <td className="num">{formatNumber(r.metrics.users)}</td>
                        <td className="num">{formatNumber(r.metrics.conversions)}</td>
                        <td className="num">{r.metrics.revenue > 0 ? formatWon(r.metrics.revenue) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <div className="p-head">
                <h3>Regions</h3>
                <div className="sub">City · sessions 기준 상위</div>
              </div>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>City</th>
                      <th className="num">Sessions</th>
                      <th className="num">Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regions.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ padding: 16, textAlign: "center", color: "var(--dim)" }}>
                          데이터 없음
                        </td>
                      </tr>
                    )}
                    {regions.map((r) => (
                      <tr key={r.label}>
                        <td>{r.label}</td>
                        <td className="num">{formatNumber(r.metrics.sessions)}</td>
                        <td className="num">{formatNumber(r.metrics.users)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      <FooterBar />
    </>
  )
}
