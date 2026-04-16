"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
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

function Ga4AnalyticsInner({ properties }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const defaultStart = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) })()

  const [selectedProperty, setSelectedProperty] = useState(searchParams.get("property") ?? properties[0]?.property_id ?? "")
  const [startDate, setStartDate] = useState(searchParams.get("from") ?? defaultStart)
  const [endDate, setEndDate] = useState(searchParams.get("to") ?? new Date().toISOString().slice(0, 10))

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pages, setPages] = useState<PageRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [daily, setDaily] = useState<DailyRow[]>([])
  const [sortKey, setSortKey] = useState<SortKey>("pageviews")
  const [sortDesc, setSortDesc] = useState(true)
  const [pathFilter, setPathFilter] = useState(searchParams.get("filter") ?? "")
  const [activePreset, setActivePreset] = useState<string | null>(null)

  // URL 동기화
  const syncUrl = useCallback((prop: string, from: string, to: string, filter: string) => {
    const params = new URLSearchParams()
    if (prop && prop !== properties[0]?.property_id) params.set("property", prop)
    params.set("from", from)
    params.set("to", to)
    if (filter.trim()) params.set("filter", filter.trim())
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false })
  }, [pathname, router, properties])

  async function fetchReport(prop?: string, from?: string, to?: string) {
    const p = prop ?? selectedProperty
    const f = from ?? startDate
    const t = to ?? endDate
    if (!p) return
    syncUrl(p, f, t, pathFilter)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/ga4/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: p, startDate: f, endDate: t }),
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 필터 변경 시 URL 동기화
  useEffect(() => {
    const t = setTimeout(() => syncUrl(selectedProperty, startDate, endDate, pathFilter), 300)
    return () => clearTimeout(t)
  }, [pathFilter]) // eslint-disable-line react-hooks/exhaustive-deps

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
      className={`px-4 py-3 font-medium text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none ${className ?? ""}`}
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
    setActivePreset(`${days}d`)
  }

  function setPreset(key: string) {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() // 0-based
    const today = now.toISOString().slice(0, 10)

    setActivePreset(key)
    switch (key) {
      case "this_month":
        setStartDate(`${y}-${String(m + 1).padStart(2, "0")}-01`)
        setEndDate(today)
        break
      case "last_month": {
        const pm = m === 0 ? 11 : m - 1
        const py = m === 0 ? y - 1 : y
        const lastDay = new Date(py, pm + 1, 0).getDate()
        setStartDate(`${py}-${String(pm + 1).padStart(2, "0")}-01`)
        setEndDate(`${py}-${String(pm + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`)
        break
      }
      case "this_quarter": {
        const qStart = Math.floor(m / 3) * 3
        setStartDate(`${y}-${String(qStart + 1).padStart(2, "0")}-01`)
        setEndDate(today)
        break
      }
      case "last_quarter": {
        const cqStart = Math.floor(m / 3) * 3
        const lqStart = cqStart - 3
        const lqy = lqStart < 0 ? y - 1 : y
        const lqm = lqStart < 0 ? lqStart + 12 : lqStart
        const lqEnd = new Date(lqy, lqm + 3, 0)
        setStartDate(`${lqy}-${String(lqm + 1).padStart(2, "0")}-01`)
        setEndDate(lqEnd.toISOString().slice(0, 10))
        break
      }
      case "this_year":
        setStartDate(`${y}-01-01`)
        setEndDate(today)
        break
    }
  }

  return (
    <div className="space-y-5">
      {/* 컨트롤 바 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* 속성 선택 */}
          {properties.length > 1 && (
            <select
              value={selectedProperty}
              onChange={(e) => { setSelectedProperty(e.target.value); fetchReport(e.target.value) }}
              className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              {properties.map((p) => (
                <option key={p.property_id} value={p.property_id}>{p.property_name}</option>
              ))}
            </select>
          )}

          {/* 기간 선택 */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {[
                { label: "7일", key: "7d", action: () => setRange(7) },
                { label: "14일", key: "14d", action: () => setRange(14) },
                { label: "30일", key: "30d", action: () => setRange(30) },
                { label: "이번 달", key: "this_month", action: () => setPreset("this_month") },
                { label: "전월", key: "last_month", action: () => setPreset("last_month") },
                { label: "이번 분기", key: "this_quarter", action: () => setPreset("this_quarter") },
                { label: "전분기", key: "last_quarter", action: () => setPreset("last_quarter") },
                { label: "올해", key: "this_year", action: () => setPreset("this_year") },
              ].map((r) => (
                <button
                  key={r.key}
                  onClick={r.action}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                    activePreset === r.key
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                      : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setActivePreset(null) }}
              className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            />
            <span className="text-xs text-slate-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setActivePreset(null) }}
              className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            />
            <button
              onClick={() => fetchReport()}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: Eye, label: "페이지뷰", value: summary.pageviews.toLocaleString(), color: "text-blue-600" },
              { icon: Users, label: "사용자", value: summary.users.toLocaleString(), color: "text-emerald-600" },
              { icon: TrendingUp, label: "세션", value: summary.sessions.toLocaleString(), color: "text-purple-600" },
              { icon: Users, label: "신규 사용자", value: summary.newUsers.toLocaleString(), color: "text-orange-600" },
              { icon: Clock, label: "평균 체류시간", value: formatDuration(summary.avgDuration), color: "text-slate-600" },
              { icon: TrendingUp, label: "이탈률", value: `${(summary.bounceRate * 100).toFixed(1)}%`, color: "text-red-500" },
            ].map((card) => (
              <div key={card.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-2.5">
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
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-5">일별 추이</h3>
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
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  페이지별 성과
                  <span className="text-xs text-slate-400 font-normal ml-2">
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
                <div className="flex gap-4 mt-3 text-xs text-slate-500">
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
                    <th className="text-left px-5 py-3 font-medium text-slate-500 dark:text-slate-400">페이지</th>
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
                      <td className="px-5 py-3.5 max-w-[300px]">
                        <p className="text-sm text-slate-900 dark:text-slate-100 truncate font-medium">
                          {row.title || row.path}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">{row.path}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-700 dark:text-slate-300">{row.pageviews.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">{row.users.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">{row.sessions.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">{formatDuration(row.avgDuration)}</td>
                      <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">{(row.bounceRate * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedPages.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-12">해당 기간 데이터가 없습니다.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function Ga4Analytics(props: Props) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> 로딩 중...</div>}>
      <Ga4AnalyticsInner {...props} />
    </Suspense>
  )
}
