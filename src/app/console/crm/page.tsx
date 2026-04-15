import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Topbar, FooterBar } from "../_components/Topbar"
import { formatNumber } from "@/lib/utils"
import { fetchKlaviyoOverview } from "@/lib/crm-insights"

export const dynamic = "force-dynamic"

function formatWon(n: number): string {
  if (n >= 100000000) return `₩${(n / 100000000).toFixed(2)}억`
  if (n >= 10000000) return `₩${(n / 10000000).toFixed(1)}천만`
  if (n >= 10000) return `₩${Math.round(n / 10000).toLocaleString("ko-KR")}만`
  return `₩${Math.round(n).toLocaleString("ko-KR")}`
}

function Empty({ brandName, message }: { brandName: string; message: string }) {
  return (
    <>
      <Topbar
        crumbs={[
          { label: "Workspace" },
          { label: brandName },
          { label: "CRM & Email", strong: true },
        ]}
      />
      <div className="canvas">
        <div className="panel">
          <div className="p-body" style={{ padding: 40, textAlign: "center", color: "var(--dim)" }}>
            {message}
          </div>
        </div>
      </div>
      <FooterBar />
    </>
  )
}

export default async function ConsoleCrmPage() {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandName = h.get("x-user-brand-name")
    ? decodeURIComponent(h.get("x-user-brand-name")!)
    : "Brand"

  if (!userId) redirect("/login")

  const overview = await fetchKlaviyoOverview()

  if ("error" in overview) {
    return (
      <Empty
        brandName={brandName}
        message={
          overview.error === "Klaviyo credentials missing"
            ? "Klaviyo API 키가 등록되지 않았습니다. Admin → API 설정에서 platform='klaviyo' 크레덴셜을 추가하세요."
            : `Klaviyo API 오류: ${overview.error}`
        }
      />
    )
  }

  const campaignById = new Map(overview.campaignMetrics.map((m) => [m.campaignId, m]))
  const flowById = new Map(overview.flowMetrics.map((m) => [m.flowId, m]))

  const totalRevenue =
    overview.campaignMetrics.reduce((s, m) => s + m.revenue, 0) +
    overview.flowMetrics.reduce((s, m) => s + m.revenue, 0)
  const totalRecipients =
    overview.campaignMetrics.reduce((s, m) => s + m.recipients, 0) +
    overview.flowMetrics.reduce((s, m) => s + m.recipients, 0)
  const totalOpens =
    overview.campaignMetrics.reduce((s, m) => s + m.opens, 0) +
    overview.flowMetrics.reduce((s, m) => s + m.opens, 0)
  const totalClicks =
    overview.campaignMetrics.reduce((s, m) => s + m.clicks, 0) +
    overview.flowMetrics.reduce((s, m) => s + m.clicks, 0)
  const totalConversions =
    overview.campaignMetrics.reduce((s, m) => s + m.conversions, 0) +
    overview.flowMetrics.reduce((s, m) => s + m.conversions, 0)

  const blendedOpenRate = totalRecipients > 0 ? (totalOpens / totalRecipients) * 100 : 0
  const blendedClickRate = totalRecipients > 0 ? (totalClicks / totalRecipients) * 100 : 0

  const activeFlows = overview.flows.filter((f) => f.status === "live" || f.status === "active")
  const recentCampaigns = overview.campaigns.slice(0, 10)
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`

  return (
    <>
      <Topbar
        crumbs={[
          { label: "Workspace" },
          { label: brandName },
          { label: "CRM & Email", strong: true },
        ]}
      />
      <div className="detail-head">
        <Link className="back-link" href="/console">
          ← Back to Overview
        </Link>
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic" style={{ background: "#c77dd620", color: "#C77DD6" }}>
                E
              </span>
              <span>
                Klaviyo · {activeFlows.length} active flows · {formatNumber(overview.totalSubscribers)}{" "}
                subscribers
              </span>
            </div>
            <h1>
              CRM &amp; <em>email</em>
            </h1>
            <div className="dh-meta">
              <span>{overview.flows.length} flows</span>
              <span>·</span>
              <span>{overview.campaigns.length} campaigns (30d)</span>
              <span>·</span>
              <span>
                Blended open <b>{blendedOpenRate.toFixed(1)}%</b>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="canvas">
        <div className="kpi-row">
          <div className="kpi">
            <div className="top">Subscribers</div>
            <div className="v">{formatNumber(overview.totalSubscribers)}</div>
            <div className="d">{overview.lists.length} lists</div>
          </div>
          <div className="kpi">
            <div className="top">Open rate</div>
            <div className="v">
              {blendedOpenRate.toFixed(1)}
              <span className="u">%</span>
            </div>
            <div className="d">30일 평균</div>
          </div>
          <div className="kpi">
            <div className="top">Click rate</div>
            <div className="v">
              {blendedClickRate.toFixed(1)}
              <span className="u">%</span>
            </div>
            <div className="d">30일 평균</div>
          </div>
          <div className="kpi">
            <div className="top">Revenue (30d)</div>
            <div className="v">{totalRevenue > 0 ? formatWon(totalRevenue) : "—"}</div>
            <div className="d">{formatNumber(totalConversions)} conversions</div>
          </div>
          <div className="kpi">
            <div className="top">Recipients</div>
            <div className="v">{formatNumber(totalRecipients)}</div>
            <div className="d">emails sent 30d</div>
          </div>
          <div className="kpi">
            <div className="top">Active flows</div>
            <div className="v">{activeFlows.length}</div>
            <div className="d">of {overview.flows.length} total</div>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>Active Flows</h3>
            <div className="sub">{activeFlows.length} live · last 30d metrics</div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "32%" }}>Flow</th>
                  <th className="num">Sent</th>
                  <th className="num">Open rate</th>
                  <th className="num">Click rate</th>
                  <th className="num">Revenue</th>
                  <th className="num">Rev / email</th>
                </tr>
              </thead>
              <tbody>
                {activeFlows.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--dim)" }}>
                      활성 플로우가 없습니다.
                    </td>
                  </tr>
                )}
                {activeFlows.map((f) => {
                  const m = flowById.get(f.id)
                  const rpe = m && m.recipients > 0 ? m.revenue / m.recipients : 0
                  return (
                    <tr key={f.id}>
                      <td>
                        <div className="cell-main">
                          <span
                            className="stat-dot"
                            style={{ display: "inline-block", background: "var(--good)" }}
                          />
                          <div>
                            <div>{f.name}</div>
                            {f.triggerType && <div className="cell-sub">trigger: {f.triggerType}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="num">{m ? formatNumber(m.recipients) : "—"}</td>
                      <td className="num">{m ? pct(m.openRate) : "—"}</td>
                      <td className="num">{m ? pct(m.clickRate) : "—"}</td>
                      <td className="num">{m && m.revenue > 0 ? formatWon(m.revenue) : "—"}</td>
                      <td className="num">{rpe > 0 ? formatWon(rpe) : "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>Recent Campaigns</h3>
            <div className="sub">{overview.campaigns.length} campaigns · sorted by send time</div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "34%" }}>Campaign</th>
                  <th>Status</th>
                  <th className="num">Send time</th>
                  <th className="num">Recipients</th>
                  <th className="num">Open rate</th>
                  <th className="num">Click rate</th>
                  <th className="num">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--dim)" }}>
                      최근 발송 캠페인이 없습니다.
                    </td>
                  </tr>
                )}
                {recentCampaigns.map((c) => {
                  const m = campaignById.get(c.id)
                  return (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.status}</td>
                      <td className="num">{c.sendTime ? c.sendTime.slice(0, 10) : "—"}</td>
                      <td className="num">{m ? formatNumber(m.recipients) : "—"}</td>
                      <td className="num">{m ? pct(m.openRate) : "—"}</td>
                      <td className="num">{m ? pct(m.clickRate) : "—"}</td>
                      <td className="num">{m && m.revenue > 0 ? formatWon(m.revenue) : "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>Lists</h3>
            <div className="sub">{overview.lists.length} lists</div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "60%" }}>List</th>
                  <th className="num">Profiles</th>
                </tr>
              </thead>
              <tbody>
                {overview.lists.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ padding: 24, textAlign: "center", color: "var(--dim)" }}>
                      리스트가 없습니다.
                    </td>
                  </tr>
                )}
                {overview.lists
                  .slice()
                  .sort((a, b) => b.profileCount - a.profileCount)
                  .slice(0, 12)
                  .map((l) => (
                    <tr key={l.id}>
                      <td>{l.name}</td>
                      <td className="num">{formatNumber(l.profileCount)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <FooterBar />
    </>
  )
}
