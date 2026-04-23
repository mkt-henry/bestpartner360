"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"
import { ChevronDown, ChevronRight, Plus, Settings, Trash2, X } from "lucide-react"
import Link from "next/link"

const CHANNELS = ["Instagram", "Facebook", "Google", "Kakao", "Naver", "Tistory", "TikTok", "YouTube", "기타"]

interface Campaign {
  id: string
  name: string
  channel: string
  start_date: string
  end_date: string | null
  kpiCount: number
}

interface BudgetRow {
  id: string
  campaign_id: string
  period_start: string
  period_end: string
  total_budget: number
}

export default function BrandKpiManager({
  brandId,
  initialCampaigns,
  initialBudgets,
}: {
  brandId: string
  initialCampaigns: Campaign[]
  initialBudgets: BudgetRow[]
}) {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [budgets, setBudgets] = useState(initialBudgets)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showNewCampaign, setShowNewCampaign] = useState(false)

  // 새 매체 폼
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    channel: "",
    start_date: "",
    end_date: "",
    total_budget: "",
  })
  const [campaignSaving, setCampaignSaving] = useState(false)
  const [campaignError, setCampaignError] = useState("")
  const [postAddNotice, setPostAddNotice] = useState("")

  // 예산 폼 (매체당 1개)
  const [budgetForm, setBudgetForm] = useState({
    period_start: "",
    period_end: "",
    total_budget: "",
  })
  const [budgetSaving, setBudgetSaving] = useState(false)
  const [budgetError, setBudgetError] = useState("")

  function getBudget(campaignId: string) {
    return budgets.find((b) => b.campaign_id === campaignId)
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      setBudgetError("")
      const existing = getBudget(id)
      if (existing) {
        setBudgetForm({
          period_start: existing.period_start,
          period_end: existing.period_end,
          total_budget: String(existing.total_budget),
        })
      } else {
        setBudgetForm({ period_start: "", period_end: "", total_budget: "" })
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  function getCurrentBudget(campaignId: string) {
    const b = getBudget(campaignId)
    if (!b) return 0
    if (b.period_start <= today && b.period_end >= today) return b.total_budget
    return 0
  }

  // 매체 추가 (+ 옵션: 예산)
  async function addCampaign() {
    if (!campaignForm.channel || !campaignForm.name || !campaignForm.start_date) {
      setCampaignError("매체, 매체명, 시작일은 필수입니다.")
      return
    }

    const budgetRaw = campaignForm.total_budget.trim()
    const hasBudget = budgetRaw !== ""
    let budgetNum = 0
    if (hasBudget) {
      if (!campaignForm.end_date) {
        setCampaignError("예산 입력 시 종료일을 설정해주세요.")
        return
      }
      budgetNum = Number(budgetRaw.replace(/,/g, ""))
      if (!Number.isFinite(budgetNum) || budgetNum < 0) {
        setCampaignError("예산은 0 이상의 숫자로 입력해주세요.")
        return
      }
    }

    setCampaignSaving(true)
    setCampaignError("")
    setPostAddNotice("")

    const supabase = createClient()
    const { data: campaign, error: campaignErr } = await supabase
      .from("campaigns")
      .insert({
        brand_id: brandId,
        name: campaignForm.name,
        channel: campaignForm.channel,
        status: "active",
        start_date: campaignForm.start_date,
        end_date: campaignForm.end_date || null,
      })
      .select("id, name, channel, start_date, end_date")
      .single()

    if (campaignErr || !campaign) {
      setCampaignError(campaignErr?.message ?? "매체 생성에 실패했습니다.")
      setCampaignSaving(false)
      return
    }

    setCampaigns((prev) => [...prev, { ...campaign, kpiCount: 0 }])

    if (hasBudget) {
      const res = await fetch("/api/admin/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaign.id,
          period_start: campaign.start_date,
          period_end: campaign.end_date,
          total_budget: budgetNum,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setBudgets((prev) => [...prev, json])
      } else {
        setPostAddNotice(`매체는 추가되었지만 예산 저장에 실패했습니다: ${json.error ?? "알 수 없는 오류"}. 해당 매체 행을 펼쳐 다시 저장해주세요.`)
      }
    }

    setCampaignForm({ name: "", channel: "", start_date: "", end_date: "", total_budget: "" })
    setShowNewCampaign(false)
    router.refresh()
    setCampaignSaving(false)
  }

  // 매체 삭제
  async function deleteCampaign(id: string) {
    if (!confirm("이 매체를 삭제하시겠습니까? 연결된 KPI, 예산, 실적 데이터가 모두 삭제됩니다.")) return
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

  // 예산 저장 (기존 삭제 후 새로 삽입)
  async function saveBudget(campaignId: string) {
    if (!budgetForm.period_start || !budgetForm.period_end || !budgetForm.total_budget) {
      setBudgetError("모든 항목을 입력해주세요.")
      return
    }
    setBudgetSaving(true)
    setBudgetError("")

    // 기존 예산 삭제
    const existing = getBudget(campaignId)
    if (existing) {
      await fetch("/api/admin/budget", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: existing.id }),
      })
    }

    // 새 예산 추가
    const res = await fetch("/api/admin/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaign_id: campaignId,
        period_start: budgetForm.period_start,
        period_end: budgetForm.period_end,
        total_budget: parseFloat(budgetForm.total_budget.replace(/,/g, "")),
      }),
    })

    const json = await res.json()
    if (res.ok) {
      setBudgets((prev) => [...prev.filter((b) => b.campaign_id !== campaignId), json])
      router.refresh()
    } else {
      setBudgetError(json.error ?? "저장 실패")
    }
    setBudgetSaving(false)
  }

  // 예산 삭제
  async function deleteBudget(campaignId: string) {
    const existing = getBudget(campaignId)
    if (!existing) return
    if (!confirm("이 예산을 삭제하시겠습니까?")) return
    const res = await fetch("/api/admin/budget", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: existing.id }),
    })
    if (res.ok) {
      setBudgets((prev) => prev.filter((b) => b.campaign_id !== campaignId))
      setBudgetForm({ period_start: "", period_end: "", total_budget: "" })
      router.refresh()
    }
  }

  return (
    <div className="panel">
      {/* Header */}
      <div className="p-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3>
          <span style={{ color: "var(--dim)", fontSize: "0.8em", fontWeight: 400 }}>{campaigns.length}개 매체</span>
        </h3>
        <button
          onClick={() => {
            setShowNewCampaign(!showNewCampaign)
            setCampaignError("")
          }}
          className={showNewCampaign ? "btn" : "btn primary"}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
        >
          {showNewCampaign ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showNewCampaign ? "취소" : "매체 추가"}
        </button>
      </div>

      {postAddNotice && (
        <div
          style={{
            padding: "0.625rem 1.25rem",
            background: "var(--bg-2)",
            borderBottom: "1px solid var(--line)",
            fontSize: "0.8rem",
            color: "var(--amber)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <span>{postAddNotice}</span>
          <button
            onClick={() => setPostAddNotice("")}
            className="btn"
            style={{ fontSize: "0.7rem" }}
          >
            닫기
          </button>
        </div>
      )}

      {/* 매체 추가 인라인 폼 */}
      {showNewCampaign && (
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--line)", background: "var(--bg-2)" }}>
          <p style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text)", marginBottom: "0.75rem" }}>새 매체 추가</p>
          <div className="form-grid cols-4">
            <div>
              <label className="form-label">매체 *</label>
              <select
                value={campaignForm.channel}
                onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value })}
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
              <label className="form-label">매체명 *</label>
              <input
                value={campaignForm.name}
                onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                className="form-input"
                placeholder="예: Instagram 브랜드광고"
              />
            </div>
            <div>
              <label className="form-label">시작일 *</label>
              <input
                type="date"
                value={campaignForm.start_date}
                onChange={(e) => setCampaignForm({ ...campaignForm, start_date: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">종료일</label>
              <input
                type="date"
                value={campaignForm.end_date}
                onChange={(e) => setCampaignForm({ ...campaignForm, end_date: e.target.value })}
                className="form-input"
              />
            </div>
          </div>
          <div className="form-grid cols-1" style={{ marginTop: "0.75rem" }}>
            <div>
              <label className="form-label">예산 (원)</label>
              <input
                type="number"
                min={0}
                value={campaignForm.total_budget}
                onChange={(e) => setCampaignForm({ ...campaignForm, total_budget: e.target.value })}
                className="form-input"
                placeholder="선택 입력 · 예: 5000000"
              />
              <p style={{ fontSize: "0.7rem", color: "var(--dim)", marginTop: "0.25rem" }}>
                입력 시 종료일이 필수이며, 예산 기간은 매체 시작/종료일과 동일하게 저장됩니다.
              </p>
            </div>
          </div>
          {campaignError && <p className="form-error">{campaignError}</p>}
          <div style={{ marginTop: "0.75rem" }}>
            <button
              onClick={addCampaign}
              disabled={campaignSaving}
              className="btn primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
            >
              <Plus className="w-4 h-4" />
              {campaignSaving ? "저장 중..." : "추가"}
            </button>
          </div>
        </div>
      )}

      {/* 매체 목록 */}
      {campaigns.length === 0 && !showNewCampaign ? (
        <div className="p-body">
          <div className="empty">
            <p>등록된 매체가 없습니다.</p>
            <button
              onClick={() => setShowNewCampaign(true)}
              className="btn primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", marginTop: "0.75rem" }}
            >
              <Plus className="w-3.5 h-3.5" />
              첫 번째 매체 추가
            </button>
          </div>
        </div>
      ) : (
        <div>
          {campaigns.map((c) => {
            const isExpanded = expandedId === c.id
            const budget = getBudget(c.id)
            const currentBudget = getCurrentBudget(c.id)

            return (
              <div key={c.id} style={{ borderBottom: "1px solid var(--line)" }}>
                {/* 매체 행 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1.25rem",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  onClick={() => toggleExpand(c.id)}
                >
                  <span style={{ color: "var(--dim)" }}>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </span>
                  <span className="tag neutral">{c.channel}</span>
                  <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text)", flex: 1 }}>
                    {c.name}
                  </span>
                  <span style={{ fontSize: "0.75rem" }}>
                    {c.kpiCount > 0 ? (
                      <span style={{ color: "var(--amber)", fontWeight: 500 }}>{c.kpiCount}개 KPI</span>
                    ) : (
                      <span style={{ color: "var(--dim)" }}>KPI 미설정</span>
                    )}
                  </span>
                  <span style={{ fontSize: "0.875rem", fontFamily: "var(--c-mono)", minWidth: "100px", textAlign: "right" as const }}>
                    {currentBudget > 0 ? (
                      <span style={{ color: "var(--text)" }}>{formatCurrency(currentBudget)}</span>
                    ) : budget ? (
                      <span style={{ color: "var(--dim)", fontSize: "0.75rem" }}>{formatCurrency(budget.total_budget)}</span>
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

                {/* 확장: 예산 설정 + 매체 삭제 */}
                {isExpanded && (
                  <div style={{ padding: "0 1.25rem 1rem 3rem", background: "var(--bg-2)" }}>
                    {/* 예산 설정 */}
                    <div>
                      <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-2)", marginBottom: "0.5rem" }}>
                        예산 설정
                        {budget && (
                          <span style={{ marginLeft: "0.5rem", color: "var(--dim)", fontWeight: 400 }}>
                            ({budget.period_start} ~ {budget.period_end} · {formatCurrency(budget.total_budget)})
                          </span>
                        )}
                      </p>
                      <div className="form-grid cols-3">
                        <div>
                          <label className="form-label">시작일</label>
                          <input
                            type="date"
                            value={budgetForm.period_start}
                            onChange={(e) => setBudgetForm({ ...budgetForm, period_start: e.target.value })}
                            className="form-input"
                          />
                        </div>
                        <div>
                          <label className="form-label">종료일</label>
                          <input
                            type="date"
                            value={budgetForm.period_end}
                            onChange={(e) => setBudgetForm({ ...budgetForm, period_end: e.target.value })}
                            className="form-input"
                          />
                        </div>
                        <div>
                          <label className="form-label">예산 (원)</label>
                          <input
                            type="number"
                            value={budgetForm.total_budget}
                            onChange={(e) => setBudgetForm({ ...budgetForm, total_budget: e.target.value })}
                            placeholder="5000000"
                            className="form-input"
                          />
                        </div>
                      </div>
                      {budgetError && <p className="form-error">{budgetError}</p>}
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <button
                          onClick={() => saveBudget(c.id)}
                          disabled={budgetSaving}
                          className="btn primary"
                        >
                          {budgetSaving ? "저장 중..." : budget ? "예산 수정" : "예산 저장"}
                        </button>
                        {budget && (
                          <button
                            onClick={() => deleteBudget(c.id)}
                            className="btn"
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                          >
                            <Trash2 className="w-3 h-3" />
                            예산 삭제
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 매체 삭제 */}
                    <div style={{ paddingTop: "0.75rem", marginTop: "0.75rem", borderTop: "1px solid var(--line)" }}>
                      <button
                        onClick={() => deleteCampaign(c.id)}
                        className="btn"
                        style={{ color: "var(--dim)", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--bad)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--dim)")}
                      >
                        <Trash2 className="w-3 h-3" />
                        이 매체 삭제
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
