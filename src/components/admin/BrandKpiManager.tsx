"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"
import { ChevronDown, ChevronRight, Plus, RefreshCw, Settings, Trash2, X } from "lucide-react"
import Link from "next/link"

const CHANNELS = ["Instagram", "Facebook", "Google", "Kakao", "Naver", "Tistory", "TikTok", "YouTube", "기타"]

// 네이버 검색광고 campaignTp에 매핑되는 한국어 라벨 (sync/naver/route.ts와 일치해야 함)
const NAVER_TAGS = ["파워링크", "브랜드검색", "쇼핑검색", "파워컨텐츠"]

interface Campaign {
  id: string
  name: string
  channel: string
  sync_tag: string | null
  start_date: string
  end_date: string | null
  kpiCount: number
  spendTotal: number
}

interface BudgetRow {
  id: string
  campaign_id: string
  period_start: string
  period_end: string
  total_budget: number
}

interface SpendRow {
  id: string
  campaign_id: string
  spend_date: string
  amount: number
}

function buildAutoName(channel: string, start: string, end: string) {
  return `${channel} · ${start} ~ ${end || "미정"}`
}

export default function BrandKpiManager({
  brandId,
  initialCampaigns,
  initialBudgets,
  hasMeta,
  hasNaver,
}: {
  brandId: string
  initialCampaigns: Campaign[]
  initialBudgets: BudgetRow[]
  hasMeta: boolean
  hasNaver: boolean
}) {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [budgets, setBudgets] = useState(initialBudgets)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // 기간 세트 추가 폼
  const [addForm, setAddForm] = useState({
    channel: "",
    sync_tag: "",
    period_start: "",
    period_end: "",
    total_budget: "",
  })
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState("")

  // 기간/예산 편집 폼
  const [editForm, setEditForm] = useState({
    sync_tag: "",
    period_start: "",
    period_end: "",
    total_budget: "",
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")

  // 지출 입력
  const [spends, setSpends] = useState<SpendRow[]>([])
  const [spendsLoading, setSpendsLoading] = useState(false)
  const [spendForm, setSpendForm] = useState({ spend_date: "", amount: "" })
  const [spendSaving, setSpendSaving] = useState(false)
  const [spendError, setSpendError] = useState("")

  // Meta 동기화
  const [metaSyncing, setMetaSyncing] = useState(false)
  const [metaSyncMsg, setMetaSyncMsg] = useState("")

  // Naver 동기화
  const [naverSyncing, setNaverSyncing] = useState(false)
  const [naverSyncMsg, setNaverSyncMsg] = useState("")

  const today = new Date().toISOString().slice(0, 10)

  function getBudget(campaignId: string) {
    return budgets.find((b) => b.campaign_id === campaignId)
  }

  // 채널별 그룹핑
  const channelGroups = useMemo(() => {
    const map = new Map<string, Campaign[]>()
    for (const c of campaigns) {
      if (!map.has(c.channel)) map.set(c.channel, [])
      map.get(c.channel)!.push(c)
    }
    // 채널 안의 기간 세트는 시작일 내림차순
    for (const arr of map.values()) {
      arr.sort((a, b) => b.start_date.localeCompare(a.start_date))
    }
    // 채널 순서는 CHANNELS 프리셋 순서를 우선, 그 외는 뒤
    const known = CHANNELS.filter((ch) => map.has(ch)).map((ch) => ({ channel: ch, items: map.get(ch)! }))
    const unknown = Array.from(map.entries())
      .filter(([ch]) => !CHANNELS.includes(ch))
      .map(([channel, items]) => ({ channel, items }))
    return [...known, ...unknown]
  }, [campaigns])

  function toggleExpand(c: Campaign) {
    if (expandedId === c.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(c.id)
    setEditError("")
    setSpendError("")
    setSpendForm({ spend_date: "", amount: "" })
    const b = getBudget(c.id)
    setEditForm({
      sync_tag: c.sync_tag ?? "",
      period_start: c.start_date,
      period_end: c.end_date ?? "",
      total_budget: b ? String(b.total_budget) : "",
    })
  }

  // 브랜드 전체 캠페인 지출 합계 재조회
  async function refreshSpendTotals() {
    const res = await fetch(`/api/admin/spend?brand_id=${brandId}`)
    if (!res.ok) return
    const json = await res.json()
    const totals = (json.totals ?? {}) as Record<string, number>
    setCampaigns((prev) => prev.map((c) => ({ ...c, spendTotal: totals[c.id] ?? 0 })))
  }

  // 확장 시 지출 로드
  useEffect(() => {
    if (!expandedId) {
      setSpends([])
      return
    }
    let cancelled = false
    setSpendsLoading(true)
    fetch(`/api/admin/spend?campaign_id=${expandedId}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        setSpends((json.spends ?? []) as SpendRow[])
      })
      .catch(() => {
        if (!cancelled) setSpends([])
      })
      .finally(() => {
        if (!cancelled) setSpendsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [expandedId])

  // 지출 추가
  async function addSpend(campaignId: string) {
    if (!spendForm.spend_date || !spendForm.amount) {
      setSpendError("일자와 금액을 입력해주세요.")
      return
    }
    setSpendSaving(true)
    setSpendError("")
    const amount = parseFloat(spendForm.amount.replace(/,/g, ""))
    const res = await fetch("/api/admin/spend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_id: campaignId, spend_date: spendForm.spend_date, amount }),
    })
    const json = await res.json()
    if (!res.ok) {
      setSpendError(json.error ?? "저장 실패")
      setSpendSaving(false)
      return
    }
    const saved = json as SpendRow
    setSpends((prev) => {
      const others = prev.filter((s) => s.spend_date !== saved.spend_date)
      return [saved, ...others].sort((a, b) => b.spend_date.localeCompare(a.spend_date))
    })
    await refreshSpendTotals()
    setSpendForm({ spend_date: "", amount: "" })
    setSpendSaving(false)
    router.refresh()
  }

  // 지출 삭제
  async function deleteSpend(campaignId: string, spend: SpendRow) {
    if (!confirm(`${spend.spend_date} 지출을 삭제하시겠습니까?`)) return
    const res = await fetch("/api/admin/spend", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: spend.id }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert(json.error ?? "삭제 실패")
      return
    }
    setSpends((prev) => prev.filter((s) => s.id !== spend.id))
    await refreshSpendTotals()
    router.refresh()
  }

  // Meta 동기화
  async function syncMeta() {
    if (!confirm("Meta에서 지출 데이터를 가져옵니다. 계속하시겠습니까?")) return
    setMetaSyncing(true)
    setMetaSyncMsg("")
    const res = await fetch("/api/admin/spend/sync/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand_id: brandId }),
    })
    const json = await res.json()
    if (!res.ok) {
      setMetaSyncMsg(`오류: ${json.error ?? "동기화 실패"}`)
      setMetaSyncing(false)
      return
    }
    if (typeof json.synced === "number") {
      let msg = json.synced > 0 ? `${json.synced}개 일자 지출 동기화 완료` : (json.message ?? "동기화 완료")
      if (Array.isArray(json.unmatched) && json.unmatched.length > 0) {
        const preview = json.unmatched.slice(0, 3).join(", ")
        const suffix = json.unmatched.length > 3 ? ` 외 ${json.unmatched.length - 3}건` : ""
        msg += ` · 분류되지 않은 Meta 캠페인: ${preview}${suffix}`
      }
      setMetaSyncMsg(msg)
    } else {
      setMetaSyncMsg("동기화 완료")
    }
    await refreshSpendTotals()
    // 현재 펼친 기간 세트가 있으면 지출 목록도 다시 조회
    if (expandedId) {
      const r = await fetch(`/api/admin/spend?campaign_id=${expandedId}`)
      if (r.ok) {
        const j = await r.json()
        setSpends((j.spends ?? []) as SpendRow[])
      }
    }
    setMetaSyncing(false)
    router.refresh()
  }

  // Naver 동기화
  async function syncNaver() {
    if (!confirm("Naver에서 지출 데이터를 가져옵니다. 계속하시겠습니까?")) return
    setNaverSyncing(true)
    setNaverSyncMsg("")
    const res = await fetch("/api/admin/spend/sync/naver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand_id: brandId }),
    })
    const json = await res.json()
    if (!res.ok) {
      setNaverSyncMsg(`오류: ${json.error ?? "동기화 실패"}`)
      setNaverSyncing(false)
      return
    }
    if (typeof json.synced === "number") {
      let msg = json.synced > 0 ? `${json.synced}개 일자 지출 동기화 완료` : (json.message ?? "동기화 완료")
      if (Array.isArray(json.unmatched_tps) && json.unmatched_tps.length > 0) {
        msg += ` · 매칭되지 않은 Naver 캠페인 유형: ${json.unmatched_tps.join(", ")}`
      }
      setNaverSyncMsg(msg)
    } else {
      setNaverSyncMsg("동기화 완료")
    }
    await refreshSpendTotals()
    if (expandedId) {
      const r = await fetch(`/api/admin/spend?campaign_id=${expandedId}`)
      if (r.ok) {
        const j = await r.json()
        setSpends((j.spends ?? []) as SpendRow[])
      }
    }
    setNaverSyncing(false)
    router.refresh()
  }

  // 기간 세트 추가
  async function addPeriodSet() {
    if (!addForm.channel || !addForm.period_start || !addForm.period_end || !addForm.total_budget) {
      setAddError("매체, 시작일, 종료일, 예산은 필수입니다.")
      return
    }
    setAddSaving(true)
    setAddError("")

    const supabase = createClient()
    const autoName = buildAutoName(addForm.channel, addForm.period_start, addForm.period_end)
    const syncTag = addForm.sync_tag.trim() || null
    const { data: campaign, error: campaignErr } = await supabase
      .from("campaigns")
      .insert({
        brand_id: brandId,
        name: autoName,
        channel: addForm.channel,
        sync_tag: syncTag,
        status: "active",
        start_date: addForm.period_start,
        end_date: addForm.period_end,
      })
      .select("id, name, channel, sync_tag, start_date, end_date")
      .single()

    if (campaignErr || !campaign) {
      setAddError(campaignErr?.message ?? "저장 실패")
      setAddSaving(false)
      return
    }

    // 예산 저장
    const res = await fetch("/api/admin/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaign_id: campaign.id,
        period_start: addForm.period_start,
        period_end: addForm.period_end,
        total_budget: parseFloat(addForm.total_budget.replace(/,/g, "")),
      }),
    })
    const budgetJson = await res.json()
    if (!res.ok) {
      // campaign은 생성됐지만 예산 실패 — 롤백 대신 오류만 표시
      setAddError(budgetJson.error ?? "예산 저장 실패")
    } else {
      setBudgets((prev) => [...prev, budgetJson])
    }

    setCampaigns((prev) => [...prev, { ...campaign, kpiCount: 0, spendTotal: 0 }])
    setAddForm({ channel: "", sync_tag: "", period_start: "", period_end: "", total_budget: "" })
    setShowAddForm(false)
    setAddSaving(false)
    router.refresh()
  }

  // 기간 세트 편집 (기간 + 예산)
  async function savePeriodSet(c: Campaign) {
    if (!editForm.period_start || !editForm.period_end || !editForm.total_budget) {
      setEditError("시작일, 종료일, 예산은 필수입니다.")
      return
    }
    setEditSaving(true)
    setEditError("")

    const supabase = createClient()
    const autoName = buildAutoName(c.channel, editForm.period_start, editForm.period_end)
    const syncTag = editForm.sync_tag.trim() || null
    const { data: updated, error: updateErr } = await supabase
      .from("campaigns")
      .update({
        name: autoName,
        sync_tag: syncTag,
        start_date: editForm.period_start,
        end_date: editForm.period_end,
      })
      .eq("id", c.id)
      .select("id, name, channel, sync_tag, start_date, end_date")
      .single()

    if (updateErr || !updated) {
      setEditError(updateErr?.message ?? "저장 실패")
      setEditSaving(false)
      return
    }

    // 예산: 기존 있으면 삭제 후 신규 삽입 (간단/일관)
    const existing = getBudget(c.id)
    if (existing) {
      await fetch("/api/admin/budget", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: existing.id }),
      })
    }
    const res = await fetch("/api/admin/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaign_id: c.id,
        period_start: editForm.period_start,
        period_end: editForm.period_end,
        total_budget: parseFloat(editForm.total_budget.replace(/,/g, "")),
      }),
    })
    const newBudget = await res.json()
    if (!res.ok) {
      setEditError(newBudget.error ?? "예산 저장 실패")
      setEditSaving(false)
      return
    }

    setCampaigns((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...updated } : x)))
    setBudgets((prev) => [...prev.filter((b) => b.campaign_id !== c.id), newBudget])
    setEditSaving(false)
    router.refresh()
  }

  // 기간 세트 삭제
  async function deletePeriodSet(id: string) {
    if (!confirm("이 기간 세트를 삭제하시겠습니까? 연결된 KPI, 예산, 실적 데이터가 모두 삭제됩니다.")) return
    const supabase = createClient()
    const { error } = await supabase.from("campaigns").delete().eq("id", id)
    if (error) {
      alert("삭제 실패: " + error.message)
      return
    }
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
    setBudgets((prev) => prev.filter((b) => b.campaign_id !== id))
    if (expandedId === id) setExpandedId(null)
    router.refresh()
  }

  const totalSets = campaigns.length

  return (
    <div className="panel">
      {/* Header */}
      <div className="p-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3>
          <span style={{ color: "var(--dim)", fontSize: "0.8em", fontWeight: 400 }}>
            {channelGroups.length}개 매체 · {totalSets}개 기간 세트
          </span>
        </h3>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          {hasMeta && (
            <button
              onClick={syncMeta}
              disabled={metaSyncing}
              className="btn"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
              title="Meta Ads 지출 데이터를 가져와 Instagram/Facebook 기간 세트에 반영합니다"
            >
              <RefreshCw className={`w-3.5 h-3.5${metaSyncing ? " animate-spin" : ""}`} />
              {metaSyncing ? "동기화 중..." : "Meta 지출 동기화"}
            </button>
          )}
          {hasNaver && (
            <button
              onClick={syncNaver}
              disabled={naverSyncing}
              className="btn"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
              title="Naver 검색광고 지출 데이터를 가져와 Naver 기간 세트에 반영합니다"
            >
              <RefreshCw className={`w-3.5 h-3.5${naverSyncing ? " animate-spin" : ""}`} />
              {naverSyncing ? "동기화 중..." : "Naver 지출 동기화"}
            </button>
          )}
          <button
            onClick={() => {
              setShowAddForm(!showAddForm)
              setAddError("")
            }}
            className={showAddForm ? "btn" : "btn primary"}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAddForm ? "취소" : "기간 세트 추가"}
          </button>
        </div>
      </div>
      {metaSyncMsg && (
        <div
          style={{
            padding: "0.5rem 1.25rem",
            fontSize: "0.75rem",
            color: metaSyncMsg.startsWith("오류") ? "var(--bad)" : "var(--amber)",
            borderBottom: "1px solid var(--line)",
            background: "var(--bg-2)",
          }}
        >
          {metaSyncMsg}
        </div>
      )}
      {naverSyncMsg && (
        <div
          style={{
            padding: "0.5rem 1.25rem",
            fontSize: "0.75rem",
            color: naverSyncMsg.startsWith("오류") ? "var(--bad)" : "var(--amber)",
            borderBottom: "1px solid var(--line)",
            background: "var(--bg-2)",
          }}
        >
          {naverSyncMsg}
        </div>
      )}

      {/* 기간 세트 추가 폼 */}
      {showAddForm && (
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--line)", background: "var(--bg-2)" }}>
          <p style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text)", marginBottom: "0.75rem" }}>
            새 기간 세트 추가
          </p>
          <div className="form-grid cols-4">
            <div>
              <label className="form-label">매체 *</label>
              <select
                value={addForm.channel}
                onChange={(e) =>
                  setAddForm({
                    ...addForm,
                    channel: e.target.value,
                    // 매체 변경 시 Naver 드롭다운 값이 다른 매체와 호환 안되므로 초기화
                    sync_tag: "",
                  })
                }
                className="form-select"
              >
                <option value="">매체 선택</option>
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">매칭 설명</label>
              {addForm.channel === "Naver" ? (
                <select
                  value={addForm.sync_tag}
                  onChange={(e) => setAddForm({ ...addForm, sync_tag: e.target.value })}
                  className="form-select"
                >
                  <option value="">선택</option>
                  {NAVER_TAGS.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={addForm.sync_tag}
                  onChange={(e) => setAddForm({ ...addForm, sync_tag: e.target.value })}
                  placeholder={
                    addForm.channel === "Instagram"
                      ? "예: IG"
                      : addForm.channel === "Facebook"
                      ? "예: FB"
                      : "캠페인명 매칭 키워드"
                  }
                  className="form-input"
                />
              )}
            </div>
            <div>
              <label className="form-label">시작일 *</label>
              <input
                type="date"
                value={addForm.period_start}
                onChange={(e) => setAddForm({ ...addForm, period_start: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">종료일 *</label>
              <input
                type="date"
                value={addForm.period_end}
                onChange={(e) => setAddForm({ ...addForm, period_end: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">예산 (원) *</label>
              <input
                type="number"
                value={addForm.total_budget}
                onChange={(e) => setAddForm({ ...addForm, total_budget: e.target.value })}
                placeholder="5000000"
                className="form-input"
              />
            </div>
          </div>
          {addError && <p className="form-error">{addError}</p>}
          <div style={{ marginTop: "0.75rem" }}>
            <button
              onClick={addPeriodSet}
              disabled={addSaving}
              className="btn primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
            >
              <Plus className="w-4 h-4" />
              {addSaving ? "저장 중..." : "추가"}
            </button>
          </div>
        </div>
      )}

      {/* 매체/기간 목록 */}
      {channelGroups.length === 0 && !showAddForm ? (
        <div className="p-body">
          <div className="empty">
            <p>등록된 기간 세트가 없습니다.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", marginTop: "0.75rem" }}
            >
              <Plus className="w-3.5 h-3.5" />
              첫 번째 기간 세트 추가
            </button>
          </div>
        </div>
      ) : (
        <div>
          {channelGroups.map((group) => (
            <div key={group.channel} style={{ borderBottom: "1px solid var(--line)" }}>
              {/* 채널 헤더 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.625rem 1.25rem",
                  background: "var(--bg-2)",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <span className="tag neutral">{group.channel}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
                  {group.items.length}개 기간
                </span>
              </div>

              {/* 기간 세트 행 */}
              {group.items.map((c) => {
                const isExpanded = expandedId === c.id
                const budget = getBudget(c.id)
                const isCurrent = c.start_date <= today && (c.end_date ?? "9999-12-31") >= today

                return (
                  <div key={c.id}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.75rem 1.25rem 0.75rem 2.5rem",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      onClick={() => toggleExpand(c)}
                    >
                      <span style={{ color: "var(--dim)" }}>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </span>
                      <span
                        style={{
                          fontSize: "0.875rem",
                          fontFamily: "var(--c-mono)",
                          color: isCurrent ? "var(--text)" : "var(--dim)",
                          fontWeight: isCurrent ? 500 : 400,
                          flex: 1,
                        }}
                      >
                        {c.start_date} ~ {c.end_date ?? "미정"}
                        {isCurrent && (
                          <span style={{ marginLeft: "0.5rem", fontSize: "0.7rem", color: "var(--amber)" }}>진행 중</span>
                        )}
                      </span>
                      <span style={{ fontSize: "0.75rem" }}>
                        {c.kpiCount > 0 ? (
                          <span style={{ color: "var(--amber)", fontWeight: 500 }}>{c.kpiCount}개 KPI</span>
                        ) : (
                          <span style={{ color: "var(--dim)" }}>KPI 미설정</span>
                        )}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontFamily: "var(--c-mono)",
                          minWidth: "180px",
                          textAlign: "right" as const,
                        }}
                      >
                        {budget ? (
                          <span style={{ color: "var(--text)" }}>
                            {formatCurrency(c.spendTotal)}
                            <span style={{ color: "var(--dim)" }}> / {formatCurrency(budget.total_budget)}</span>
                            {budget.total_budget > 0 && (
                              <span
                                style={{
                                  marginLeft: "0.375rem",
                                  color:
                                    c.spendTotal > budget.total_budget
                                      ? "var(--bad)"
                                      : c.spendTotal / budget.total_budget >= 0.9
                                      ? "var(--amber)"
                                      : "var(--dim)",
                                }}
                              >
                                ({Math.round((c.spendTotal / budget.total_budget) * 100)}%)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: "var(--dim)", fontSize: "0.75rem" }}>예산 미설정</span>
                        )}
                      </span>
                      <Link
                        href={`/admin/campaigns/${c.id}/kpi`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontSize: "0.75rem",
                          color: "var(--amber)",
                          fontWeight: 500,
                          marginLeft: "0.5rem",
                          textDecoration: "none",
                        }}
                      >
                        <Settings className="w-3 h-3" />
                        KPI
                      </Link>
                    </div>

                    {/* 확장: 기간 + 예산 편집 */}
                    {isExpanded && (
                      <div style={{ padding: "0 1.25rem 1rem 3.75rem", background: "var(--bg-2)" }}>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "var(--text-2)",
                            marginBottom: "0.5rem",
                          }}
                        >
                          기간 · 예산 편집
                        </p>
                        <div className="form-grid cols-4">
                          <div>
                            <label className="form-label">매칭 설명</label>
                            {c.channel === "Naver" ? (
                              <select
                                value={editForm.sync_tag}
                                onChange={(e) => setEditForm({ ...editForm, sync_tag: e.target.value })}
                                className="form-select"
                              >
                                <option value="">선택</option>
                                {NAVER_TAGS.map((tag) => (
                                  <option key={tag} value={tag}>
                                    {tag}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={editForm.sync_tag}
                                onChange={(e) => setEditForm({ ...editForm, sync_tag: e.target.value })}
                                placeholder={
                                  c.channel === "Instagram"
                                    ? "예: IG"
                                    : c.channel === "Facebook"
                                    ? "예: FB"
                                    : "캠페인명 매칭 키워드"
                                }
                                className="form-input"
                              />
                            )}
                          </div>
                          <div>
                            <label className="form-label">시작일</label>
                            <input
                              type="date"
                              value={editForm.period_start}
                              onChange={(e) => setEditForm({ ...editForm, period_start: e.target.value })}
                              className="form-input"
                            />
                          </div>
                          <div>
                            <label className="form-label">종료일</label>
                            <input
                              type="date"
                              value={editForm.period_end}
                              onChange={(e) => setEditForm({ ...editForm, period_end: e.target.value })}
                              className="form-input"
                            />
                          </div>
                          <div>
                            <label className="form-label">예산 (원)</label>
                            <input
                              type="number"
                              value={editForm.total_budget}
                              onChange={(e) => setEditForm({ ...editForm, total_budget: e.target.value })}
                              placeholder="5000000"
                              className="form-input"
                            />
                          </div>
                        </div>
                        {editError && <p className="form-error">{editError}</p>}
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            marginTop: "0.5rem",
                            justifyContent: "space-between",
                          }}
                        >
                          <button
                            onClick={() => savePeriodSet(c)}
                            disabled={editSaving}
                            className="btn primary"
                          >
                            {editSaving ? "저장 중..." : "저장"}
                          </button>
                          <button
                            onClick={() => deletePeriodSet(c.id)}
                            className="btn"
                            style={{
                              color: "var(--dim)",
                              fontSize: "0.75rem",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.375rem",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--bad)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--dim)")}
                          >
                            <Trash2 className="w-3 h-3" />
                            이 기간 세트 삭제
                          </button>
                        </div>

                        {/* 지출 입력 */}
                        <div
                          style={{
                            marginTop: "1rem",
                            paddingTop: "1rem",
                            borderTop: "1px solid var(--line)",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              color: "var(--text-2)",
                              marginBottom: "0.5rem",
                            }}
                          >
                            지출 입력
                          </p>
                          <div className="form-grid cols-3">
                            <div>
                              <label className="form-label">일자</label>
                              <input
                                type="date"
                                value={spendForm.spend_date}
                                min={c.start_date}
                                max={c.end_date ?? undefined}
                                onChange={(e) => setSpendForm({ ...spendForm, spend_date: e.target.value })}
                                className="form-input"
                              />
                            </div>
                            <div>
                              <label className="form-label">금액 (원)</label>
                              <input
                                type="number"
                                value={spendForm.amount}
                                placeholder="0"
                                onChange={(e) => setSpendForm({ ...spendForm, amount: e.target.value })}
                                className="form-input"
                              />
                            </div>
                            <div style={{ display: "flex", alignItems: "flex-end" }}>
                              <button
                                onClick={() => addSpend(c.id)}
                                disabled={spendSaving}
                                className="btn primary"
                                style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                {spendSaving ? "저장 중..." : "추가"}
                              </button>
                            </div>
                          </div>
                          {spendError && <p className="form-error">{spendError}</p>}

                          <div style={{ marginTop: "0.75rem" }}>
                            {spendsLoading ? (
                              <p style={{ fontSize: "0.75rem", color: "var(--dim)" }}>불러오는 중...</p>
                            ) : spends.length === 0 ? (
                              <p style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
                                등록된 지출 없음
                              </p>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                {spends.map((s) => (
                                  <div
                                    key={s.id}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.75rem",
                                      fontSize: "0.8rem",
                                      fontFamily: "var(--c-mono)",
                                      padding: "0.25rem 0",
                                    }}
                                  >
                                    <span style={{ color: "var(--dim)", minWidth: "90px" }}>
                                      {s.spend_date}
                                    </span>
                                    <span style={{ flex: 1 }}>{formatCurrency(Number(s.amount))}</span>
                                    <button
                                      onClick={() => deleteSpend(c.id, s)}
                                      title="삭제"
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "var(--dim)",
                                        padding: "0.125rem",
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--bad)")}
                                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--dim)")}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontSize: "0.75rem",
                                    paddingTop: "0.375rem",
                                    marginTop: "0.25rem",
                                    borderTop: "1px solid var(--line)",
                                  }}
                                >
                                  <span style={{ color: "var(--dim)" }}>합계</span>
                                  <span style={{ fontFamily: "var(--c-mono)", color: "var(--text)" }}>
                                    {formatCurrency(
                                      spends.reduce((sum, s) => sum + Number(s.amount), 0)
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
