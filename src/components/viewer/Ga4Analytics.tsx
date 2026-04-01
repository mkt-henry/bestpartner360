"use client"

import { useState, useEffect } from "react"
import { Loader2, TrendingUp, Users, Eye, Clock, ArrowUpDown, Search, X } from "lucide-react"
import { KpiLineChart } from "@/components/viewer/SpendChart"

interface Ga4Property {
  property_id: string
  property_name: string
}

interface PageRow {
  path: string
  title: string
  pageviews: number
  users: number
  sessions: number
  avgDuration: number
  bounceRate: number
}

interface Summary {
  pageviews: number
  users: number
  sessions: number
  newUsers: number
  avgDuration: number
  bounceRate: number
}

interface DailyRow {
  [key: string]: string | number
  date: string
  pageviews: number
  users: number
  sessions: number
}

interface Props {
  properties: Ga4Property[]
}

type SortKey = "pageviews" | "users" | "sessions" | "avgDuration" | "bounceRate"

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m > 0 ? `${m}분 ${s}초` : `${s}초`
}

export default function Ga4Analytics({ properties }: Props) {
  const [selectedProperty, setSelectedProperty] = useState(properties[0]?.property_id ?? "")
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pages, setPages] = useState<PageRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [daily, setDaily] = useState<DailyRow[]>([])
  const [sortKey, setSortKey] = useState<SortKey>("pageviews")
  const [sortDesc, setSortDesc] = useState(true)
  const [pathFilter, setPathFilter] = useState("")

  async function fetchReport() {
    if (!selectedProperty) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/ga4/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: selectedProperty, startDate, endDate }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setPages(json.pages ?? [])
      setSummary(json.summary ?? null)
      setDaily(json.daily ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "데이터 로드 실패")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [selectedProperty])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDesc(!sortDesc)
    } else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  const filteredPages = pathFilter.trim()
    ? pages.filter((p) => {
        const q = pathFilter.trim().toLowerCase()
        return p.path.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)
      })
    : pages

  const sortedPages = [...filteredPages].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey]
    return sortDesc ? -diff : diff
  })

  const filteredSummary = pathFilter.trim() && filteredPages.length !== pages.length
    ? {
        pageviews: filteredPages.reduce((s, p) => s + p.pageviews, 0),
        users: filteredPages.reduce((s, p) => s + p.users, 0),
        sessions: filteredPages.reduce((s, p) => s + p.sessions, 0),
      }
    : null

  const SortHeader = ({ label, k, className }: { label: string; k: SortKey; className?: string }) => (
    <th
      className={`px-3 py-2.5 font-medium text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none ${className ?? ""}`}
      onClick={() => handleSort(k)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {sortKey === k && <ArrowUpDown className="w-3 h-3" />}
      </span>
    </th>
  )

  // 빠른 기간 선택
  function setRange(days: number) {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)
    setStartDate(start.toISOString().slice(0, 10))
    setEndDate(end.toISOString().slice(0, 10))
  }

  return (
    <div className="space-y-5">
      {/* 컨트롤 바 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* 속성 선택 */}
          {properties.length > 1 && (
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              {properties.map((p) => (
                <option key={p.property_id} value={p.property_id}>{p.property_name}</option>
              ))}
            </select>
          )}

          {/* 기간 선택 */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {[
                { label: "7일", days: 7 },
                { label: "14일", days: 14 },
                { label: "30일", days: 30 },
                { label: "90일", days: 90 },
              ].map((r) => (
                <button
                  key={r.days}
                  onClick={() => setRange(r.days)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  {r.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            />
            <span className="text-xs text-slate-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            />
            <button
              onClick={fetchReport}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "조회"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> 데이터 불러오는 중...
        </div>
      )}

      {!loading && summary && (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: Eye, label: "페이지뷰", value: summary.pageviews.toLocaleString(), color: "text-blue-600" },
              { icon: Users, label: "사용자", value: summary.users.toLocaleString(), color: "text-emerald-600" },
              { icon: TrendingUp, label: "세션", value: summary.sessions.toLocaleString(), color: "text-purple-600" },
              { icon: Users, label: "신규 사용자", value: summary.newUsers.toLocaleString(), color: "text-orange-600" },
              { icon: Clock, label: "평균 체류시간", value: formatDuration(summary.avgDuration), color: "text-slate-600" },
              { icon: TrendingUp, label: "이탈률", value: `${(summary.bounceRate * 100).toFixed(1)}%`, color: "text-red-500" },
            ].map((card) => (
              <div key={card.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
                  <span className="text-[10px] text-slate-400 font-medium">{card.label}</span>
                </div>
                <p className={`text-lg font-bold ${card.color} dark:text-slate-100`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* 일별 추이 차트 */}
          {daily.length > 1 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">일별 추이</h3>
              <KpiLineChart
                data={daily}
                metrics={[
                  { key: "pageviews", label: "페이지뷰", color: "#2563eb" },
                  { key: "users", label: "사용자", color: "#10b981" },
                  { key: "sessions", label: "세션", color: "#8b5cf6" },
                ]}
              />
            </div>
          )}

          {/* 페이지별 테이블 */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  페이지별 성과
                  <span className="text-xs text-slate-400 font-normal ml-1">
                    {pathFilter.trim() ? `${filteredPages.length} / ${pages.length}개` : `상위 ${pages.length}개`}
                  </span>
                </h3>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={pathFilter}
                    onChange={(e) => setPathFilter(e.target.value)}
                    placeholder="경로 또는 제목 필터 (예: /entry/)"
                    className="pl-8 pr-8 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 w-full sm:w-64"
                  />
                  {pathFilter && (
                    <button
                      onClick={() => setPathFilter("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {filteredSummary && (
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  <span>필터 결과: 페이지뷰 <strong className="text-slate-700 dark:text-slate-300">{filteredSummary.pageviews.toLocaleString()}</strong></span>
                  <span>사용자 <strong className="text-slate-700 dark:text-slate-300">{filteredSummary.users.toLocaleString()}</strong></span>
                  <span>세션 <strong className="text-slate-700 dark:text-slate-300">{filteredSummary.sessions.toLocaleString()}</strong></span>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
                    <th className="text-left px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400">페이지</th>
                    <SortHeader label="페이지뷰" k="pageviews" className="text-right" />
                    <SortHeader label="사용자" k="users" className="text-right" />
                    <SortHeader label="세션" k="sessions" className="text-right" />
                    <SortHeader label="평균 체류" k="avgDuration" className="text-right" />
                    <SortHeader label="이탈률" k="bounceRate" className="text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {sortedPages.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                      <td className="px-4 py-3 max-w-[300px]">
                        <p className="text-sm text-slate-900 dark:text-slate-100 truncate font-medium">
                          {row.title || row.path}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{row.path}</p>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">{row.pageviews.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-slate-700 dark:text-slate-300">{row.users.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-slate-700 dark:text-slate-300">{row.sessions.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-slate-700 dark:text-slate-300">{formatDuration(row.avgDuration)}</td>
                      <td className="px-3 py-3 text-right text-slate-700 dark:text-slate-300">{(row.bounceRate * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedPages.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">해당 기간 데이터가 없습니다.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
