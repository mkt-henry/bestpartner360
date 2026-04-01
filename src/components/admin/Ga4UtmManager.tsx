"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp, Save, ExternalLink, Link2 } from "lucide-react"
import type { Brand, Ga4UtmEntry, Ga4UtmPerformance } from "@/types"

interface Props {
  brandId: string
  brands: Brand[]
  entries: (Ga4UtmEntry & { performance: Ga4UtmPerformance[] })[]
}

const METRICS = [
  { key: "sessions", label: "세션", unit: "" },
  { key: "users", label: "사용자", unit: "" },
  { key: "pageviews", label: "페이지뷰", unit: "" },
  { key: "bounce_rate", label: "이탈률", unit: "%" },
  { key: "avg_session_duration", label: "평균 세션시간", unit: "초" },
  { key: "conversions", label: "전환수", unit: "" },
  { key: "revenue", label: "수익", unit: "원" },
]

export default function Ga4UtmManager({ brandId, brands, entries: initialEntries }: Props) {
  const router = useRouter()
  const [entries, setEntries] = useState(initialEntries)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 새 UTM 폼
  const [form, setForm] = useState({
    label: "", landing_url: "", utm_source: "", utm_medium: "",
    utm_campaign: "", utm_term: "", utm_content: "",
  })
  const [urlInput, setUrlInput] = useState("")

  function parseUtmUrl(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed) return
    try {
      const url = new URL(trimmed)
      const p = url.searchParams
      const source = p.get("utm_source") ?? ""
      const medium = p.get("utm_medium") ?? ""
      const campaign = p.get("utm_campaign") ?? ""
      const term = p.get("utm_term") ?? ""
      const content = p.get("utm_content") ?? ""
      if (!source && !medium) return // UTM 파라미터가 없으면 무시

      // UTM 파라미터 제거한 깨끗한 랜딩 URL
      p.delete("utm_source"); p.delete("utm_medium"); p.delete("utm_campaign")
      p.delete("utm_term"); p.delete("utm_content")
      const remaining = p.toString()
      const cleanUrl = `${url.origin}${url.pathname}${remaining ? `?${remaining}` : ""}`

      setForm({
        label: campaign || `${source}/${medium}`,
        landing_url: cleanUrl,
        utm_source: source,
        utm_medium: medium,
        utm_campaign: campaign,
        utm_term: term,
        utm_content: content,
      })
      setUrlInput("")
    } catch {
      // URL 파싱 실패 시 무시
    }
  }

  // 데이터 입력 폼
  const [perfForm, setPerfForm] = useState({
    record_date: new Date().toISOString().slice(0, 10),
    sessions: "", users: "", pageviews: "",
    bounce_rate: "", avg_session_duration: "", conversions: "", revenue: "",
  })
  const [perfSaving, setPerfSaving] = useState(false)

  async function addEntry() {
    if (!form.label || !form.utm_source || !form.utm_medium) {
      setError("이름, utm_source, utm_medium은 필수입니다.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/ga4-utm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: brandId, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEntries((prev) => [{ ...data, performance: [] }, ...prev])
      setForm({ label: "", landing_url: "", utm_source: "", utm_medium: "", utm_campaign: "", utm_term: "", utm_content: "" })
      setShowAdd(false)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "추가 실패")
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm("이 UTM 항목과 모든 성과 데이터가 삭제됩니다.")) return
    try {
      const res = await fetch("/api/admin/ga4-utm", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setEntries((prev) => prev.filter((e) => e.id !== id))
      if (expandedId === id) setExpandedId(null)
      router.refresh()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "삭제 실패") }
  }

  async function savePerformance(entryId: string) {
    setPerfSaving(true)
    try {
      const res = await fetch("/api/admin/ga4-utm/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utm_entry_id: entryId,
          record_date: perfForm.record_date,
          sessions: parseInt(perfForm.sessions) || 0,
          users: parseInt(perfForm.users) || 0,
          pageviews: parseInt(perfForm.pageviews) || 0,
          bounce_rate: parseFloat(perfForm.bounce_rate) || null,
          avg_session_duration: parseFloat(perfForm.avg_session_duration) || null,
          conversions: parseInt(perfForm.conversions) || 0,
          revenue: parseFloat(perfForm.revenue) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEntries((prev) =>
        prev.map((e) => {
          if (e.id !== entryId) return e
          const perf = e.performance.filter((p) => p.record_date !== perfForm.record_date)
          return { ...e, performance: [data, ...perf].sort((a, b) => b.record_date.localeCompare(a.record_date)) }
        })
      )
      setPerfForm({ ...perfForm, sessions: "", users: "", pageviews: "", bounce_rate: "", avg_session_duration: "", conversions: "", revenue: "" })
      router.refresh()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "저장 실패") }
    finally { setPerfSaving(false) }
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

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* 추가 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowAdd(!showAdd); setError(null) }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition"
        >
          {showAdd ? "취소" : <><Plus className="w-3.5 h-3.5" /> UTM 추가</>}
        </button>
      </div>

      {/* 추가 폼 */}
      {showAdd && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">새 UTM 추가</p>

          {/* URL 붙여넣기로 자동 파싱 */}
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Link2 className="w-3 h-3 inline mr-1" />
              UTM 링크 붙여넣기 (자동 파싱)
            </label>
            <div className="flex gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/?utm_source=naver&utm_medium=blog&utm_campaign=..."
                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => parseUtmUrl(urlInput)}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition"
              >
                파싱
              </button>
            </div>
          </div>

          <div className="relative flex items-center">
            <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
            <span className="px-3 text-[10px] text-slate-400">또는 직접 입력</span>
            <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">이름 *</label>
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="예: 4월 프로모션 블로그" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">랜딩 URL</label>
              <input value={form.landing_url} onChange={(e) => setForm({ ...form, landing_url: e.target.value })} placeholder="https://example.com/promo" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">source *</label>
              <input value={form.utm_source} onChange={(e) => setForm({ ...form, utm_source: e.target.value })} placeholder="naver" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">medium *</label>
              <input value={form.utm_medium} onChange={(e) => setForm({ ...form, utm_medium: e.target.value })} placeholder="cpc" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">campaign</label>
              <input value={form.utm_campaign} onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })} placeholder="spring_sale" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">term</label>
              <input value={form.utm_term} onChange={(e) => setForm({ ...form, utm_term: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">content</label>
              <input value={form.utm_content} onChange={(e) => setForm({ ...form, utm_content: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100" />
            </div>
          </div>
          <button onClick={addEntry} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} 추가
          </button>
        </div>
      )}

      {/* UTM 목록 */}
      {entries.length === 0 && !showAdd ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-12 text-center">
          <p className="text-sm text-slate-400 mb-3">등록된 UTM이 없습니다.</p>
          <button onClick={() => setShowAdd(true)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            첫 번째 UTM 추가 →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id
            const totalSessions = entry.performance.reduce((s, p) => s + p.sessions, 0)
            const totalUsers = entry.performance.reduce((s, p) => s + p.users, 0)
            const totalConversions = entry.performance.reduce((s, p) => s + p.conversions, 0)

            return (
              <div key={entry.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* 헤더 */}
                <button
                  onClick={() => {
                    setExpandedId(isExpanded ? null : entry.id)
                    setPerfForm({ record_date: new Date().toISOString().slice(0, 10), sessions: "", users: "", pageviews: "", bounce_rate: "", avg_session_duration: "", conversions: "", revenue: "" })
                  }}
                  className="w-full px-5 py-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{entry.label}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-mono">{entry.utm_source}/{entry.utm_medium}</span>
                      {entry.utm_campaign && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">{entry.utm_campaign}</span>}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                    <span>세션 <strong className="text-slate-700 dark:text-slate-300">{totalSessions.toLocaleString()}</strong></span>
                    <span>사용자 <strong className="text-slate-700 dark:text-slate-300">{totalUsers.toLocaleString()}</strong></span>
                    <span>전환 <strong className="text-slate-700 dark:text-slate-300">{totalConversions.toLocaleString()}</strong></span>
                  </div>
                </button>

                {/* 확장 패널 */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-4 space-y-4">
                    {/* UTM URL */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                      <code className="text-[10px] text-slate-600 dark:text-slate-400 flex-1 truncate">{buildUtmUrl(entry)}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(buildUtmUrl(entry))}
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex-shrink-0"
                      >
                        복사
                      </button>
                    </div>

                    {/* 데이터 입력 */}
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-3">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">성과 데이터 입력</p>
                      <div className="flex gap-2 flex-wrap items-end">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">날짜</label>
                          <input type="date" value={perfForm.record_date} onChange={(e) => setPerfForm({ ...perfForm, record_date: e.target.value })} className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-700 dark:text-slate-100" />
                        </div>
                        {METRICS.map((m) => (
                          <div key={m.key}>
                            <label className="block text-[10px] text-slate-400 mb-0.5">{m.label}</label>
                            <input
                              type="number"
                              value={perfForm[m.key as keyof typeof perfForm]}
                              onChange={(e) => setPerfForm({ ...perfForm, [m.key]: e.target.value })}
                              placeholder="0"
                              className="w-20 px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-700 dark:text-slate-100"
                            />
                          </div>
                        ))}
                        <button onClick={() => savePerformance(entry.id)} disabled={perfSaving} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium rounded transition">
                          {perfSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} 저장
                        </button>
                      </div>
                    </div>

                    {/* 성과 테이블 */}
                    {entry.performance.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-600">
                              <th className="text-left px-2 py-2 text-slate-500 font-medium">날짜</th>
                              {METRICS.map((m) => <th key={m.key} className="text-right px-2 py-2 text-slate-500 font-medium">{m.label}</th>)}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {entry.performance.map((p) => (
                              <tr key={p.record_date} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{p.record_date}</td>
                                <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">{p.sessions.toLocaleString()}</td>
                                <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">{p.users.toLocaleString()}</td>
                                <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">{p.pageviews.toLocaleString()}</td>
                                <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">{p.bounce_rate != null ? `${p.bounce_rate}%` : "-"}</td>
                                <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">{p.avg_session_duration != null ? `${p.avg_session_duration}초` : "-"}</td>
                                <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">{p.conversions.toLocaleString()}</td>
                                <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">{Number(p.revenue).toLocaleString()}원</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* 삭제 */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                      <button onClick={() => deleteEntry(entry.id)} className="text-xs text-slate-400 hover:text-red-600 flex items-center gap-1 transition">
                        <Trash2 className="w-3 h-3" /> 이 UTM 삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
