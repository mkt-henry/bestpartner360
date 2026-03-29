"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"
import { ChevronDown, ChevronRight, Plus, Settings, Trash2, X } from "lucide-react"
import Link from "next/link"

const CHANNELS = ["Instagram", "Facebook", "Google", "Kakao", "Naver", "TikTok", "YouTube", "기타"]

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
  })
  const [campaignSaving, setCampaignSaving] = useState(false)
  const [campaignError, setCampaignError] = useState("")

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

  // 매체 추가
  async function addCampaign() {
    if (!campaignForm.channel || !campaignForm.name || !campaignForm.start_date) {
      setCampaignError("매체, 매체명, 시작일은 필수입니다.")
      return
    }
    setCampaignSaving(true)
    setCampaignError("")

    const supabase = createClient()
    const { data, error } = await supabase
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

    if (error) {
      setCampaignError(error.message)
    } else {
      setCampaigns((prev) => [...prev, { ...data, kpiCount: 0 }])
      setCampaignForm({ name: "", channel: "", start_date: "", end_date: "" })
      setShowNewCampaign(false)
      router.refresh()
    }
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
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{campaigns.length}개 매체</span>
        </div>
        <button
          onClick={() => {
            setShowNewCampaign(!showNewCampaign)
            setCampaignError("")
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition"
        >
          {showNewCampaign ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showNewCampaign ? "취소" : "매체 추가"}
        </button>
      </div>

      {/* 매체 추가 인라인 폼 */}
      {showNewCampaign && (
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-blue-50/50 dark:bg-blue-900/10">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-3">새 매체 추가</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">매체 *</label>
              <select
                value={campaignForm.channel}
                onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-slate-100"
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
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">매체명 *</label>
              <input
                value={campaignForm.name}
                onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                placeholder="예: Instagram 브랜드광고"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">시작일 *</label>
              <input
                type="date"
                value={campaignForm.start_date}
                onChange={(e) => setCampaignForm({ ...campaignForm, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">종료일</label>
              <input
                type="date"
                value={campaignForm.end_date}
                onChange={(e) => setCampaignForm({ ...campaignForm, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          </div>
          {campaignError && <p className="text-xs text-red-600 mb-2">{campaignError}</p>}
          <button
            onClick={addCampaign}
            disabled={campaignSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            {campaignSaving ? "저장 중..." : "추가"}
          </button>
        </div>
      )}

      {/* 매체 목록 */}
      {campaigns.length === 0 && !showNewCampaign ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-slate-400 mb-3">등록된 매체가 없습니다.</p>
          <button
            onClick={() => setShowNewCampaign(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            첫 번째 매체 추가
          </button>
        </div>
      ) : (
        <div>
          {campaigns.map((c) => {
            const isExpanded = expandedId === c.id
            const budget = getBudget(c.id)
            const currentBudget = getCurrentBudget(c.id)

            return (
              <div key={c.id} className="border-b border-slate-100 dark:border-slate-700 last:border-b-0">
                {/* 매체 행 */}
                <div
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition cursor-pointer"
                  onClick={() => toggleExpand(c.id)}
                >
                  <div className="text-slate-400">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
                    {c.channel}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 flex-1">
                    {c.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {c.kpiCount > 0 ? (
                      <span className="text-blue-600 dark:text-blue-400 font-medium">{c.kpiCount}개 KPI</span>
                    ) : (
                      "KPI 미설정"
                    )}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400 min-w-[100px] text-right">
                    {currentBudget > 0 ? (
                      formatCurrency(currentBudget)
                    ) : budget ? (
                      <span className="text-xs text-slate-400">{formatCurrency(budget.total_budget)}</span>
                    ) : (
                      <span className="text-xs text-slate-400">예산 미설정</span>
                    )}
                  </span>
                  <Link
                    href={`/admin/campaigns/${c.id}/kpi`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium ml-2"
                  >
                    <Settings className="w-3 h-3" />
                    KPI
                  </Link>
                </div>

                {/* 확장: 예산 설정 + 매체 삭제 */}
                {isExpanded && (
                  <div className="px-5 pb-4 pl-12 space-y-4">
                    {/* 예산 설정 */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                        예산 설정
                        {budget && (
                          <span className="ml-2 text-slate-400 font-normal">
                            ({budget.period_start} ~ {budget.period_end} · {formatCurrency(budget.total_budget)})
                          </span>
                        )}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">시작일</label>
                          <input
                            type="date"
                            value={budgetForm.period_start}
                            onChange={(e) => setBudgetForm({ ...budgetForm, period_start: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">종료일</label>
                          <input
                            type="date"
                            value={budgetForm.period_end}
                            onChange={(e) => setBudgetForm({ ...budgetForm, period_end: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">예산 (원)</label>
                          <input
                            type="number"
                            value={budgetForm.total_budget}
                            onChange={(e) => setBudgetForm({ ...budgetForm, total_budget: e.target.value })}
                            placeholder="5000000"
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                          />
                        </div>
                      </div>
                      {budgetError && <p className="text-xs text-red-600 mt-1">{budgetError}</p>}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => saveBudget(c.id)}
                          disabled={budgetSaving}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition"
                        >
                          {budgetSaving ? "저장 중..." : budget ? "예산 수정" : "예산 저장"}
                        </button>
                        {budget && (
                          <button
                            onClick={() => deleteBudget(c.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-red-600 hover:border-red-300 text-xs font-medium rounded-lg transition"
                          >
                            <Trash2 className="w-3 h-3" />
                            예산 삭제
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 매체 삭제 */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                      <button
                        onClick={() => deleteCampaign(c.id)}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-600 transition"
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
