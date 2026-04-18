"use client"

import { useState } from "react"
import { KpiLineChart } from "@/components/viewer/SpendChart"
import type { Ga4UtmEntry, Ga4UtmPerformance } from "@/types"

interface EntryWithPerf extends Ga4UtmEntry {
  performance: Ga4UtmPerformance[]
}

interface Props {
  entries: EntryWithPerf[]
  monthStart?: string
  today?: string
}

function buildUtmUrl(entry: Ga4UtmEntry) {
  const params = new URLSearchParams()
  params.set("utm_source", entry.utm_source)
  params.set("utm_medium", entry.utm_medium)
  if (entry.utm_campaign) params.set("utm_campaign", entry.utm_campaign)
  if (entry.utm_term) params.set("utm_term", entry.utm_term)
  if (entry.utm_content) params.set("utm_content", entry.utm_content)
  const base = entry.landing_url || "https://example.com"
  return `${base}${base.includes("?") ? "&" : "?"}${params.toString()}`
}

type SortKey = "sessions" | "users" | "pageviews" | "bounceRate" | "conversions" | "revenue"

export default function Ga4UtmDashboard({ entries, monthStart, today }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("sessions")
  const [sortDesc, setSortDesc] = useState(true)

  function copyUtmUrl(entryId: string, url: string) {
    navigator.clipboard.writeText(url)
    setCopiedId(entryId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDesc(!sortDesc)
    else { setSortKey(key); setSortDesc(true) }
  }

  const sortIcon = (k: SortKey) => sortKey === k ? (sortDesc ? " \u2193" : " \u2191") : ""

  if (entries.length === 0) {
    return (
      <div style={{ color: "var(--dim)", padding: 24, textAlign: "center", fontSize: 12 }}>
        등록된 UTM 항목이 없습니다.
      </div>
    )
  }

  const rows = entries.map((entry) => {
    const perf = entry.performance
    const sessions = perf.reduce((s, p) => s + p.sessions, 0)
    const users = perf.reduce((s, p) => s + p.users, 0)
    const pageviews = perf.reduce((s, p) => s + p.pageviews, 0)
    const conversions = perf.reduce((s, p) => s + p.conversions, 0)
    const revenue = perf.reduce((s, p) => s + Number(p.revenue), 0)
    const bounceRates = perf.filter((p) => p.bounce_rate != null)
    const bounceRate = bounceRates.length > 0
      ? bounceRates.reduce((s, p) => s + Number(p.bounce_rate), 0) / bounceRates.length
      : -1
    return { entry, sessions, users, pageviews, conversions, revenue, bounceRate }
  })

  const sorted = [...rows].sort((a, b) => sortDesc ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey])

  const expandedEntry = expandedId ? sorted.find((r) => r.entry.id === expandedId) : null

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="panel">
        <div className="p-head">
          <h3>UTM 성과</h3>
          <div className="sub">{entries.length}건{monthStart && today ? ` \u00b7 ${monthStart} \u2014 ${today}` : ""}</div>
        </div>
        <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: "24%" }}>UTM</th>
              <th>소스 / 매체</th>
              <th className="num" style={{ cursor: "pointer" }} onClick={() => handleSort("sessions")}>세션{sortIcon("sessions")}</th>
              <th className="num" style={{ cursor: "pointer" }} onClick={() => handleSort("users")}>사용자{sortIcon("users")}</th>
              <th className="num" style={{ cursor: "pointer" }} onClick={() => handleSort("pageviews")}>페이지뷰{sortIcon("pageviews")}</th>
              <th className="num" style={{ cursor: "pointer" }} onClick={() => handleSort("bounceRate")}>이탈률{sortIcon("bounceRate")}</th>
              <th className="num" style={{ cursor: "pointer" }} onClick={() => handleSort("conversions")}>전환{sortIcon("conversions")}</th>
              <th className="num" style={{ cursor: "pointer" }} onClick={() => handleSort("revenue")}>수익{sortIcon("revenue")}</th>
              <th style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ entry, sessions, users, pageviews, conversions, revenue, bounceRate }) => {
              const isExpanded = expandedId === entry.id
              const convRate = sessions > 0 ? ((conversions / sessions) * 100).toFixed(1) : "0"

              return (
                <tr
                  key={entry.id}
                  className={isExpanded ? "expanded" : undefined}
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <div className="cell-main">
                      <div>
                        <div>{entry.label}</div>
                        {entry.utm_campaign && <div className="cell-sub">{entry.utm_campaign}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="tag" style={{ background: "var(--bg-2)", color: "var(--steel)", fontFamily: "var(--c-mono)", fontSize: 10 }}>
                      {entry.utm_source}/{entry.utm_medium}
                    </span>
                  </td>
                  <td className="num" style={{ fontWeight: 600 }}>{sessions.toLocaleString()}</td>
                  <td className="num">{users.toLocaleString()}</td>
                  <td className="num">{pageviews.toLocaleString()}</td>
                  <td className="num">{bounceRate >= 0 ? `${bounceRate.toFixed(1)}%` : "-"}</td>
                  <td className="num">
                    <span style={{ fontWeight: 600 }}>{conversions.toLocaleString()}</span>
                    <span style={{ fontSize: 10, color: "var(--dim)", marginLeft: 4 }}>({convRate}%)</span>
                  </td>
                  <td className="num" style={{ fontWeight: 600 }}>{revenue.toLocaleString()}<span style={{ fontSize: 10, color: "var(--dim)", fontWeight: 400 }}>원</span></td>
                  <td style={{ textAlign: "center", color: "var(--dim)", fontSize: 10 }}>
                    <span className="caret" style={isExpanded ? { transform: "rotate(180deg)", color: "var(--amber)" } : undefined}>▾</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      {expandedEntry && (() => {
        const { entry } = expandedEntry
        const utmUrl = buildUtmUrl(entry)
        const chartData = entry.performance.length >= 2
          ? [...entry.performance]
              .sort((a, b) => a.record_date.localeCompare(b.record_date))
              .map((p) => ({
                date: p.record_date,
                sessions: p.sessions,
                users: p.users,
                conversions: p.conversions,
              }))
          : null

        return (
          <div className="panel">
            <div className="p-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <h3>{entry.label}</h3>
                <div className="sub">
                  {entry.utm_source}/{entry.utm_medium}
                  {entry.utm_campaign ? ` / ${entry.utm_campaign}` : ""}
                </div>
              </div>
            </div>

            <div className="p-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* UTM link */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6,
                padding: "8px 12px",
              }}>
                <code style={{ flex: 1, fontSize: 10, color: "var(--text-2)", fontFamily: "var(--c-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {utmUrl}
                </code>
                <a
                  href={utmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: "var(--dim)", fontSize: 12, flexShrink: 0 }}
                  title="새 탭에서 열기"
                >
                  ↗
                </a>
                <button
                  onClick={(e) => { e.stopPropagation(); copyUtmUrl(entry.id, utmUrl) }}
                  className="chip"
                  style={{ fontSize: 10, padding: "3px 8px" }}
                >
                  {copiedId === entry.id ? "복사됨" : "복사"}
                </button>
              </div>

              {/* Chart */}
              {chartData && (
                <div>
                  <div style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>일별 추이</div>
                  <KpiLineChart
                    data={chartData}
                    metrics={[
                      { key: "sessions", label: "세션", color: "#7DB8D6" },
                      { key: "users", label: "사용자", color: "#5EC27A" },
                      { key: "conversions", label: "전환", color: "#8AA6A1" },
                    ]}
                  />
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
