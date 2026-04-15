import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Topbar, FooterBar } from "../_components/Topbar"
import { createClient } from "@/lib/supabase/server"
import { formatNumber } from "@/lib/utils"

export const dynamic = "force-dynamic"

type AlertRule = {
  id: string
  name: string
  metric: string
  operator: string
  threshold: number
  scope: Record<string, unknown>
  notify_channel: string
  is_active: boolean
}

type AlertEvent = {
  id: string
  rule_id: string | null
  severity: "crit" | "warn" | "info"
  title: string
  message: string | null
  status: "open" | "ack" | "resolved"
  fired_at: string
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return "방금"
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default async function ConsoleAlertsPage() {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandIdsHeader = h.get("x-user-brand-ids")
  const brandName = h.get("x-user-brand-name")
    ? decodeURIComponent(h.get("x-user-brand-name")!)
    : "Brand"

  if (!userId) redirect("/login")
  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []

  const supabase = await createClient()
  let rules: AlertRule[] = []
  let events: AlertEvent[] = []
  let schemaMissing = false

  if (brandIds.length > 0) {
    const [rulesRes, eventsRes] = await Promise.all([
      supabase
        .from("alert_rules")
        .select("id, name, metric, operator, threshold, scope, notify_channel, is_active")
        .in("brand_id", brandIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("alert_events")
        .select("id, rule_id, severity, title, message, status, fired_at")
        .in("brand_id", brandIds)
        .order("fired_at", { ascending: false })
        .limit(50),
    ])
    if (rulesRes.error?.code === "42P01" || eventsRes.error?.code === "42P01") {
      schemaMissing = true
    } else {
      rules = (rulesRes.data ?? []) as AlertRule[]
      events = (eventsRes.data ?? []) as AlertEvent[]
    }
  }

  const openEvents = events.filter((e) => e.status === "open")
  const critCount = openEvents.filter((e) => e.severity === "crit").length
  const warnCount = openEvents.filter((e) => e.severity === "warn").length
  const activeRules = rules.filter((r) => r.is_active).length
  const resolvedToday = events.filter((e) => {
    if (e.status !== "resolved") return false
    const d = new Date(e.fired_at)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  }).length

  return (
    <>
      <Topbar
        crumbs={[
          { label: "Workspace" },
          { label: brandName },
          { label: "Alerts", strong: true },
        ]}
        alerts={openEvents.length}
      />
      <div className="detail-head">
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic" style={{ background: "#e5553b20", color: "#E5553B" }}>
                !
              </span>
              <span>
                Alert center · {openEvents.length} active · {resolvedToday} resolved today
              </span>
            </div>
            <h1>
              Alerts &amp; <em>rules</em>
            </h1>
            <div className="dh-meta">
              <span style={{ color: "var(--bad)" }}>{critCount} critical</span>
              <span>·</span>
              <span style={{ color: "var(--amber)" }}>{warnCount} warnings</span>
              <span>·</span>
              <span>
                {activeRules} active rules · {rules.length} total
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="canvas">
        {schemaMissing && (
          <div className="panel">
            <div className="p-body" style={{ padding: 24, color: "var(--dim)", fontSize: 12 }}>
              Alerts 모듈 DB 스키마가 아직 적용되지 않았습니다. <code>supabase/migrations/008_alerts.sql</code>{" "}
              마이그레이션을 실행하세요.
            </div>
          </div>
        )}

        <div className="panel alerts">
          <div className="p-head">
            <h3>Active Alerts</h3>
            <div className="sub">{openEvents.length} unresolved</div>
          </div>
          <div className="p-body">
            {!schemaMissing && openEvents.length === 0 && (
              <div style={{ padding: 24, color: "var(--dim)", fontSize: 12, textAlign: "center" }}>
                현재 활성 알림이 없습니다.
              </div>
            )}
            {openEvents.map((a) => (
              <div
                key={a.id}
                className={`alert ${a.severity === "crit" ? "crit" : a.severity === "warn" ? "warn" : "info"}`}
              >
                <div className="bullet" />
                <div className="body">
                  <div className="top">
                    <span className="tag">
                      {a.severity === "crit"
                        ? "Critical"
                        : a.severity === "warn"
                          ? "Warn"
                          : "Info"}
                    </span>
                    <span className="time">{relativeTime(a.fired_at)}</span>
                  </div>
                  <div className="msg">{a.title}</div>
                  {a.message && <div className="meta">{a.message}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>Alert Rules</h3>
            <div className="sub">
              {activeRules} active · {rules.length} total
            </div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "35%" }}>Rule</th>
                  <th>Condition</th>
                  <th>Channel</th>
                  <th className="num">Triggered</th>
                  <th className="num">Status</th>
                </tr>
              </thead>
              <tbody>
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--dim)" }}>
                      {schemaMissing ? "스키마 미적용" : "규칙이 없습니다. 관리자가 추가하세요."}
                    </td>
                  </tr>
                )}
                {rules.map((r) => {
                  const triggered = events.filter((e) => e.rule_id === r.id).length
                  return (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td style={{ fontSize: 11, color: "var(--text-2)" }}>
                        {r.metric} {r.operator} {r.threshold}
                      </td>
                      <td>{r.notify_channel}</td>
                      <td className="num">{formatNumber(triggered)} times</td>
                      <td className="num">
                        <span
                          className="stat-dot"
                          style={{
                            display: "inline-block",
                            background: r.is_active ? "var(--good)" : "var(--dim)",
                          }}
                        />{" "}
                        {r.is_active ? "Active" : "Paused"}
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
