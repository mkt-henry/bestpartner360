"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
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

const PRESETS = [
  { label: "7일", key: "7d" },
  { label: "14일", key: "14d" },
  { label: "30일", key: "30d" },
  { label: "이번 달", key: "this_month" },
  { label: "전월", key: "last_month" },
  { label: "이번 분기", key: "this_quarter" },
  { label: "전분기", key: "last_quarter" },
  { label: "올해", key: "this_year" },
]

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
  const [activePreset, setActivePreset] = useState<string | null>("30d")
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  const favStorageKey = `ga4_favorites_${selectedProperty}`

  useEffect(() => {
    try {
      const stored = localStorage.getItem(favStorageKey)
      if (stored) setFavorites(new Set(JSON.parse(stored)))
      else setFavorites(new Set())
    } catch { setFavorites(new Set()) }
  }, [favStorageKey])

  function toggleFavorite(path: string) {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      localStorage.setItem(favStorageKey, JSON.stringify([...next]))
      return next
    })
  }

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

  useEffect(() => { fetchReport() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => syncUrl(selectedProperty, startDate, endDate, pathFilter), 300)
    return () => clearTimeout(t)
  }, [pathFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  function applyPreset(key: string) {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const today = now.toISOString().slice(0, 10)
    let from = startDate, to = endDate

    if (key.endsWith("d")) {
      const days = parseInt(key)
      const d = new Date(); d.setDate(d.getDate() - days)
      from = d.toISOString().slice(0, 10); to = today
    } else {
      switch (key) {
        case "this_month": from = `${y}-${String(m + 1).padStart(2, "0")}-01`; to = today; break
        case "last_month": { const pm = m === 0 ? 11 : m - 1; const py = m === 0 ? y - 1 : y; const ld = new Date(py, pm + 1, 0).getDate(); from = `${py}-${String(pm + 1).padStart(2, "0")}-01`; to = `${py}-${String(pm + 1).padStart(2, "0")}-${String(ld).padStart(2, "0")}`; break }
        case "this_quarter": { const qs = Math.floor(m / 3) * 3; from = `${y}-${String(qs + 1).padStart(2, "0")}-01`; to = today; break }
        case "last_quarter": { const cqs = Math.floor(m / 3) * 3; const lqs = cqs - 3; const ly = lqs < 0 ? y - 1 : y; const lm = lqs < 0 ? lqs + 12 : lqs; const le = new Date(ly, lm + 3, 0); from = `${ly}-${String(lm + 1).padStart(2, "0")}-01`; to = le.toISOString().slice(0, 10); break }
        case "this_year": from = `${y}-01-01`; to = today; break
      }
    }
    setStartDate(from); setEndDate(to); setActivePreset(key)
    fetchReport(undefined, from, to)
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDesc(!sortDesc)
    else { setSortKey(key); setSortDesc(true) }
  }

  const filteredPages = pages.filter((p) => {
    if (showFavoritesOnly && !favorites.has(p.path)) return false
    if (pathFilter.trim()) {
      const q = pathFilter.trim().toLowerCase()
      return p.path.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)
    }
    return true
  })
  const sortedPages = [...filteredPages].sort((a, b) => sortDesc ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey])

  const sortIcon = (k: SortKey) => sortKey === k ? (sortDesc ? " ↓" : " ↑") : ""

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 컨트롤 바 */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        {properties.length > 1 && (
          <select
            value={selectedProperty}
            onChange={(e) => { setSelectedProperty(e.target.value); fetchReport(e.target.value) }}
            className="form-input"
            style={{ width: "auto", fontSize: 11, padding: "6px 10px" }}
          >
            {properties.map((p) => (
              <option key={p.property_id} value={p.property_id}>{p.property_name}</option>
            ))}
          </select>
        )}

        {PRESETS.map((r) => (
          <button
            key={r.key}
            onClick={() => applyPreset(r.key)}
            className={`chip ${activePreset === r.key ? "on" : ""}`}
          >
            {r.label}
          </button>
        ))}

        <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setActivePreset(null) }} className="form-input" style={{ width: "auto", fontSize: 11, padding: "5px 8px" }} />
        <span style={{ fontSize: 11, color: "var(--dim)" }}>~</span>
        <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setActivePreset(null) }} className="form-input" style={{ width: "auto", fontSize: 11, padding: "5px 8px" }} />
        <button onClick={() => fetchReport()} disabled={loading} className="btn primary" style={{ fontSize: 11, padding: "6px 12px" }}>
          {loading ? "조회 중..." : "조회"}
        </button>
      </div>

      {error && (
        <div style={{ background: "color-mix(in srgb, var(--bad) 15%, transparent)", color: "var(--bad)", fontSize: 12, padding: "10px 14px", borderRadius: 8 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0", color: "var(--dim)", fontSize: 12, gap: 8 }}>
          데이터 불러오는 중...
        </div>
      )}

      {!loading && summary && (
        <>
          {/* KPI 카드 */}
          <div className="kpi-row">
            {[
              { label: "페이지뷰", value: summary.pageviews.toLocaleString() },
              { label: "사용자", value: summary.users.toLocaleString() },
              { label: "세션", value: summary.sessions.toLocaleString() },
              { label: "신규 사용자", value: summary.newUsers.toLocaleString() },
              { label: "평균 체류시간", value: formatDuration(summary.avgDuration) },
              { label: "이탈률", value: `${(summary.bounceRate * 100).toFixed(1)}%` },
            ].map((card) => (
              <div key={card.label} className="kpi">
                <div className="top"><span>{card.label}</span></div>
                <div className="v">{card.value}</div>
              </div>
            ))}
          </div>

          {/* 일별 추이 차트 */}
          {daily.length > 1 && (
            <div className="panel">
              <div className="p-head">
                <h3>일별 추이</h3>
                <div className="sub">{startDate} — {endDate}</div>
              </div>
              <div className="p-body" style={{ padding: 16 }}>
                <KpiLineChart
                  data={daily}
                  metrics={[
                    { key: "pageviews", label: "페이지뷰", color: "#7DB8D6" },
                    { key: "users", label: "사용자", color: "#5EC27A" },
                    { key: "sessions", label: "세션", color: "#8b5cf6" },
                  ]}
                />
              </div>
            </div>
          )}

          {/* 페이지별 성과 테이블 */}
          <div className="panel">
            <div className="p-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <h3>페이지별 성과</h3>
                <div className="sub">
                  {pathFilter.trim() ? `${filteredPages.length} / ${pages.length}개` : `상위 ${pages.length}개`}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={`chip ${showFavoritesOnly ? "on" : ""}`}
                  style={{ fontSize: 11, whiteSpace: "nowrap" }}
                  title="즐겨찾기한 페이지만 보기"
                >
                  ★ 즐겨찾기{showFavoritesOnly ? ` (${favorites.size})` : ""}
                </button>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={pathFilter}
                    onChange={(e) => setPathFilter(e.target.value)}
                    placeholder="경로 또는 제목 필터 (예: /entry/)"
                    className="form-input"
                    style={{ fontSize: 11, padding: "6px 10px", paddingLeft: 28, width: 260 }}
                  />
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--dim)", fontSize: 12 }}>🔍</span>
                  {pathFilter && (
                    <button
                      onClick={() => setPathFilter("")}
                      style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 14 }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 32, textAlign: "center" }}>★</th>
                    <th style={{ width: "36%" }}>페이지</th>
                    <th className="num" style={{ cursor: "pointer" }} onClick={() => handleSort("pageviews")}>페이지뷰{sortIcon("pageviews")}</th>
                    <th className="num" style={{ cursor: "pointer" }} onClick={() => handleSort("users")}>사용자{sortIcon("users")}</th>
                    <th className="num" style={{ cursor: "pointer" }} onClick={() => handleSort("sessions")}>세션{sortIcon("sessions")}</th>
                    <th className="num" style={{ cursor: "pointer" }} onClick={() => handleSort("avgDuration")}>평균 체류{sortIcon("avgDuration")}</th>
                    <th className="num" style={{ cursor: "pointer" }} onClick={() => handleSort("bounceRate")}>이탈률{sortIcon("bounceRate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPages.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--dim)" }}>
                        {showFavoritesOnly ? "즐겨찾기한 페이지가 없습니다." : pathFilter.trim() ? "필터 결과 없음" : "해당 기간 데이터가 없습니다."}
                      </td>
                    </tr>
                  )}
                  {sortedPages.map((row, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: "center", padding: "0 4px" }}>
                        <button
                          onClick={() => toggleFavorite(row.path)}
                          style={{
                            background: "none", border: "none", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 2,
                            color: favorites.has(row.path) ? "var(--amber)" : "var(--dim)",
                            opacity: favorites.has(row.path) ? 1 : 0.4,
                          }}
                          title={favorites.has(row.path) ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                        >
                          {favorites.has(row.path) ? "★" : "☆"}
                        </button>
                      </td>
                      <td>
                        <div className="cell-main">
                          <div>
                            <div>{row.title || row.path}</div>
                            <div className="cell-sub" style={{ fontFamily: "var(--c-mono)" }}>{row.path}</div>
                          </div>
                        </div>
                      </td>
                      <td className="num" style={{ fontWeight: 600 }}>{row.pageviews.toLocaleString()}</td>
                      <td className="num">{row.users.toLocaleString()}</td>
                      <td className="num">{row.sessions.toLocaleString()}</td>
                      <td className="num">{formatDuration(row.avgDuration)}</td>
                      <td className="num">{(row.bounceRate * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function Ga4Analytics(props: Props) {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0", color: "var(--dim)", fontSize: 12 }}>로딩 중...</div>}>
      <Ga4AnalyticsInner {...props} />
    </Suspense>
  )
}
