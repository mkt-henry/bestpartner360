"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp, Save, Link2 } from "lucide-react"
import type { Ga4UtmEntry, Ga4UtmPerformance } from "@/types"

interface Props {
  brandId: string
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

export default function Ga4UtmManager({ brandId, entries: initialEntries }: Props) {
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
      if (!source && !medium) return

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
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {error && (
        <div style={{ background: "#e5553b1a", color: "var(--bad)", fontSize: 12, padding: "10px 14px", borderRadius: 8, border: "1px solid #e5553b30" }}>{error}</div>
      )}

      {/* 추가 버튼 */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => { setShowAdd(!showAdd); setError(null) }}
          className={showAdd ? "btn" : "btn primary"}
        >
          {showAdd ? "취소" : <><Plus style={{ width: 13, height: 13 }} /> UTM 추가</>}
        </button>
      </div>

      {/* 추가 폼 */}
      {showAdd && (
        <div className="panel">
          <div className="p-head">
            <h3>새 UTM 추가</h3>
          </div>
          <div className="p-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* URL 붙여넣기로 자동 파싱 */}
            <div>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Link2 style={{ width: 10, height: 10 }} />
                UTM 링크 붙여넣기 (자동 파싱)
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/?utm_source=naver&utm_medium=blog&utm_campaign=..."
                  className="form-input"
                  style={{ flex: 1, fontFamily: "var(--c-mono)", fontSize: 11 }}
                />
                <button
                  type="button"
                  onClick={() => parseUtmUrl(urlInput)}
                  className="btn"
                >
                  파싱
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
              <span style={{ fontSize: 10, color: "var(--dim)" }}>또는 직접 입력</span>
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            </div>

            <div className="form-grid cols-2">
              <div>
                <label className="form-label">이름 *</label>
                <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="예: 4월 프로모션 블로그" className="form-input" />
              </div>
              <div>
                <label className="form-label">랜딩 URL</label>
                <input value={form.landing_url} onChange={(e) => setForm({ ...form, landing_url: e.target.value })} placeholder="https://example.com/promo" className="form-input" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              <div>
                <label className="form-label">source *</label>
                <input value={form.utm_source} onChange={(e) => setForm({ ...form, utm_source: e.target.value })} placeholder="naver" className="form-input" />
              </div>
              <div>
                <label className="form-label">medium *</label>
                <input value={form.utm_medium} onChange={(e) => setForm({ ...form, utm_medium: e.target.value })} placeholder="cpc" className="form-input" />
              </div>
              <div>
                <label className="form-label">campaign</label>
                <input value={form.utm_campaign} onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })} placeholder="spring_sale" className="form-input" />
              </div>
              <div>
                <label className="form-label">term</label>
                <input value={form.utm_term} onChange={(e) => setForm({ ...form, utm_term: e.target.value })} className="form-input" />
              </div>
              <div>
                <label className="form-label">content</label>
                <input value={form.utm_content} onChange={(e) => setForm({ ...form, utm_content: e.target.value })} className="form-input" />
              </div>
            </div>
            <div className="form-actions">
              <button onClick={addEntry} disabled={saving} className="btn primary" style={{ opacity: saving ? 0.6 : 1 }}>
                {saving ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Plus style={{ width: 13, height: 13 }} />} 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UTM 목록 */}
      {entries.length === 0 && !showAdd ? (
        <div className="empty">
          <p style={{ marginBottom: 10 }}>등록된 UTM이 없습니다.</p>
          <button onClick={() => setShowAdd(true)} style={{ fontSize: 12, color: "var(--amber)" }}>
            첫 번째 UTM 추가 →
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id
            const totalSessions = entry.performance.reduce((s, p) => s + p.sessions, 0)
            const totalUsers = entry.performance.reduce((s, p) => s + p.users, 0)
            const totalConversions = entry.performance.reduce((s, p) => s + p.conversions, 0)

            return (
              <div key={entry.id} className="panel">
                {/* 헤더 */}
                <button
                  onClick={() => {
                    setExpandedId(isExpanded ? null : entry.id)
                    setPerfForm({ record_date: new Date().toISOString().slice(0, 10), sessions: "", users: "", pageviews: "", bounce_rate: "", avg_session_duration: "", conversions: "", revenue: "" })
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    textAlign: "left",
                    transition: "background .15s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-2)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  {isExpanded ? <ChevronUp style={{ width: 14, height: 14, color: "var(--dim)" }} /> : <ChevronDown style={{ width: 14, height: 14, color: "var(--dim)" }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.label}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                      <span className="tag" style={{ fontFamily: "var(--c-mono)", background: "#1877F220", color: "#6FA8F5" }}>{entry.utm_source}/{entry.utm_medium}</span>
                      {entry.utm_campaign && <span className="tag neutral" style={{ fontFamily: "var(--c-mono)" }}>{entry.utm_campaign}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 10, color: "var(--dim)" }}>
                    <span>세션 <strong style={{ color: "var(--text-2)" }}>{totalSessions.toLocaleString()}</strong></span>
                    <span>사용자 <strong style={{ color: "var(--text-2)" }}>{totalUsers.toLocaleString()}</strong></span>
                    <span>전환 <strong style={{ color: "var(--text-2)" }}>{totalConversions.toLocaleString()}</strong></span>
                  </div>
                </button>

                {/* 확장 패널 */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--line)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* UTM URL */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-2)", borderRadius: 6, padding: "8px 12px" }}>
                      <code style={{ fontSize: 10, color: "var(--dim)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--c-mono)" }}>{buildUtmUrl(entry)}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(buildUtmUrl(entry))}
                        style={{ fontSize: 10, color: "var(--amber)", fontWeight: 500, flexShrink: 0 }}
                      >
                        복사
                      </button>
                    </div>

                    {/* 데이터 입력 */}
                    <div style={{ background: "var(--bg-2)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                      <p className="form-label">성과 데이터 입력</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div>
                          <label className="form-label">날짜</label>
                          <input type="date" value={perfForm.record_date} onChange={(e) => setPerfForm({ ...perfForm, record_date: e.target.value })} className="form-input" style={{ fontSize: 11, padding: "6px 8px" }} />
                        </div>
                        {METRICS.map((m) => (
                          <div key={m.key}>
                            <label className="form-label">{m.label}</label>
                            <input
                              type="number"
                              value={perfForm[m.key as keyof typeof perfForm]}
                              onChange={(e) => setPerfForm({ ...perfForm, [m.key]: e.target.value })}
                              placeholder="0"
                              className="form-input"
                              style={{ width: 72, fontSize: 11, padding: "6px 8px" }}
                            />
                          </div>
                        ))}
                        <button onClick={() => savePerformance(entry.id)} disabled={perfSaving} className="btn primary" style={{ padding: "6px 10px", fontSize: 10, opacity: perfSaving ? 0.6 : 1 }}>
                          {perfSaving ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Save style={{ width: 12, height: 12 }} />} 저장
                        </button>
                      </div>
                    </div>

                    {/* 성과 테이블 */}
                    {entry.performance.length > 0 && (
                      <div className="tbl-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>날짜</th>
                              {METRICS.map((m) => <th key={m.key} className="num">{m.label}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {entry.performance.map((p) => (
                              <tr key={p.record_date}>
                                <td style={{ color: "var(--text-2)" }}>{p.record_date}</td>
                                <td className="num" style={{ color: "var(--text-2)" }}>{p.sessions.toLocaleString()}</td>
                                <td className="num" style={{ color: "var(--text-2)" }}>{p.users.toLocaleString()}</td>
                                <td className="num" style={{ color: "var(--text-2)" }}>{p.pageviews.toLocaleString()}</td>
                                <td className="num" style={{ color: "var(--text-2)" }}>{p.bounce_rate != null ? `${p.bounce_rate}%` : "-"}</td>
                                <td className="num" style={{ color: "var(--text-2)" }}>{p.avg_session_duration != null ? `${p.avg_session_duration}초` : "-"}</td>
                                <td className="num" style={{ color: "var(--text-2)" }}>{p.conversions.toLocaleString()}</td>
                                <td className="num" style={{ color: "var(--text-2)" }}>{Number(p.revenue).toLocaleString()}원</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* 삭제 */}
                    <div style={{ paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        style={{ fontSize: 11, color: "var(--dim)", display: "flex", alignItems: "center", gap: 4, transition: "color .15s" }}
                        onMouseEnter={(e) => e.currentTarget.style.color = "var(--bad)"}
                        onMouseLeave={(e) => e.currentTarget.style.color = "var(--dim)"}
                      >
                        <Trash2 style={{ width: 12, height: 12 }} /> 이 UTM 삭제
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
