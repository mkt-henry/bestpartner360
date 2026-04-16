"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Copy, Check, ExternalLink } from "lucide-react"
import { KpiLineChart } from "@/components/viewer/SpendChart"
import type { Ga4UtmEntry, Ga4UtmPerformance } from "@/types"

interface EntryWithPerf extends Ga4UtmEntry {
  performance: Ga4UtmPerformance[]
}

interface Props {
  entries: EntryWithPerf[]
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

export default function Ga4UtmDashboard({ entries }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function copyUtmUrl(entryId: string, url: string) {
    navigator.clipboard.writeText(url)
    setCopiedId(entryId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-12 text-center">
        <p className="text-sm text-slate-400">등록된 UTM 항목이 없습니다.</p>
      </div>
    )
  }

  // UTM별로 성과 요약 + 정렬 (세션 많은 순)
  const sorted = [...entries].sort((a, b) => {
    const aS = a.performance.reduce((s, p) => s + p.sessions, 0)
    const bS = b.performance.reduce((s, p) => s + p.sessions, 0)
    return bS - aS
  })

  return (
    <div className="space-y-3">
      {/* 테이블 형태 요약 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">UTM별 이번 달 성과</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
                <th className="text-left px-5 py-3 font-medium text-slate-500 dark:text-slate-400">UTM</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">source / medium</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 dark:text-slate-400">세션</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 dark:text-slate-400">사용자</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 dark:text-slate-400">페이지뷰</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 dark:text-slate-400">이탈률</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 dark:text-slate-400">전환</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 dark:text-slate-400">수익</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {sorted.map((entry) => {
                const perf = entry.performance
                const sessions = perf.reduce((s, p) => s + p.sessions, 0)
                const users = perf.reduce((s, p) => s + p.users, 0)
                const pageviews = perf.reduce((s, p) => s + p.pageviews, 0)
                const conversions = perf.reduce((s, p) => s + p.conversions, 0)
                const revenue = perf.reduce((s, p) => s + Number(p.revenue), 0)
                const bounceRates = perf.filter((p) => p.bounce_rate != null)
                const avgBounce = bounceRates.length > 0
                  ? bounceRates.reduce((s, p) => s + Number(p.bounce_rate), 0) / bounceRates.length
                  : null

                const isExpanded = expandedId === entry.id
                const convRate = sessions > 0 ? ((conversions / sessions) * 100).toFixed(1) : "0"

                return (
                  <tr
                    key={entry.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-[180px]">{entry.label}</p>
                      {entry.utm_campaign && <span className="text-[10px] text-slate-400 mt-0.5 block">{entry.utm_campaign}</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-mono">
                        {entry.utm_source}/{entry.utm_medium}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-700 dark:text-slate-300">{sessions.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">{users.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">{pageviews.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">{avgBounce != null ? `${avgBounce.toFixed(1)}%` : "-"}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{conversions.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 ml-1">({convRate}%)</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-700 dark:text-slate-300">{revenue.toLocaleString()}원</td>
                    <td className="px-3 py-3.5 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 선택된 UTM의 상세 정보 + 일별 추이 차트 */}
      {expandedId && (() => {
        const entry = sorted.find((e) => e.id === expandedId)
        if (!entry) return null

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
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5">{entry.label}</h3>
              <p className="text-xs text-slate-400">{entry.utm_source}/{entry.utm_medium}{entry.utm_campaign ? ` / ${entry.utm_campaign}` : ""}</p>
            </div>

            {/* UTM 링크 */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-lg px-4 py-3">
              <code className="text-[10px] text-slate-600 dark:text-slate-400 flex-1 truncate font-mono">{utmUrl}</code>
              <a
                href={utmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 text-slate-400 hover:text-blue-600 transition"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={(e) => { e.stopPropagation(); copyUtmUrl(entry.id, utmUrl) }}
                className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-700 transition"
              >
                {copiedId === entry.id ? <><Check className="w-3 h-3" /> 복사됨</> : <><Copy className="w-3 h-3" /> 복사</>}
              </button>
            </div>

            {/* 일별 추이 차트 */}
            {chartData && (
              <div>
                <p className="text-xs text-slate-400 mb-3">일별 추이</p>
                <KpiLineChart
                  data={chartData}
                  metrics={[
                    { key: "sessions", label: "세션", color: "#2563eb" },
                    { key: "users", label: "사용자", color: "#10b981" },
                    { key: "conversions", label: "전환", color: "#f59e0b" },
                  ]}
                />
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
