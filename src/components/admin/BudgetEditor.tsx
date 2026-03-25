"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"

interface Budget {
  id?: string
  period_start: string
  period_end: string
  total_budget: number
}

interface SpendRecord {
  spend_date: string
  amount: number
}

export default function BudgetEditor({
  campaignId,
  initialBudgets,
  initialSpends,
}: {
  campaignId: string
  initialBudgets: Budget[]
  initialSpends: SpendRecord[]
}) {
  const router = useRouter()
  const [budgets, setBudgets] = useState(initialBudgets)
  const [spends, setSpends] = useState(initialSpends)
  const [budgetForm, setBudgetForm] = useState({ period_start: "", period_end: "", total_budget: "" })
  const [spendForm, setSpendForm] = useState({ spend_date: new Date().toISOString().slice(0, 10), amount: "" })
  const [saving, setSaving] = useState(false)

  async function addBudget() {
    if (!budgetForm.period_start || !budgetForm.period_end || !budgetForm.total_budget) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("budgets")
      .insert({
        campaign_id: campaignId,
        period_start: budgetForm.period_start,
        period_end: budgetForm.period_end,
        total_budget: parseFloat(budgetForm.total_budget.replace(/,/g, "")),
      })
      .select()
      .single()

    if (!error && data) {
      setBudgets((prev) => [data, ...prev])
      setBudgetForm({ period_start: "", period_end: "", total_budget: "" })
      router.refresh()
    } else {
      alert("저장 실패: " + error?.message)
    }
    setSaving(false)
  }

  async function addSpend() {
    if (!spendForm.spend_date || !spendForm.amount) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("spend_records")
      .upsert(
        {
          campaign_id: campaignId,
          spend_date: spendForm.spend_date,
          amount: parseFloat(spendForm.amount.replace(/,/g, "")),
        },
        { onConflict: "campaign_id,spend_date" }
      )

    if (!error) {
      setSpends((prev) => {
        const idx = prev.findIndex((s) => s.spend_date === spendForm.spend_date)
        const newSpend = { spend_date: spendForm.spend_date, amount: parseFloat(spendForm.amount) }
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = newSpend
          return next
        }
        return [newSpend, ...prev]
      })
      setSpendForm({ spend_date: new Date().toISOString().slice(0, 10), amount: "" })
      router.refresh()
    } else {
      alert("저장 실패: " + error.message)
    }
    setSaving(false)
  }

  const totalSpend = spends.reduce((s, r) => s + Number(r.amount), 0)

  return (
    <div className="space-y-8">
      {/* Budget Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">기간별 예산 설정</h3>
        <div className="flex gap-3 flex-wrap items-end mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">시작일</label>
            <input
              type="date"
              value={budgetForm.period_start}
              onChange={(e) => setBudgetForm({ ...budgetForm, period_start: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">종료일</label>
            <input
              type="date"
              value={budgetForm.period_end}
              onChange={(e) => setBudgetForm({ ...budgetForm, period_end: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">예산 (원)</label>
            <input
              type="number"
              value={budgetForm.total_budget}
              onChange={(e) => setBudgetForm({ ...budgetForm, total_budget: e.target.value })}
              className="w-40 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="5000000"
            />
          </div>
          <button
            onClick={addBudget}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
          >
            추가
          </button>
        </div>

        {budgets.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">기간</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">예산</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {budgets.map((b, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 text-slate-700">
                      {b.period_start} ~ {b.period_end}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                      {formatCurrency(Number(b.total_budget))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Spend Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">일별 지출 입력</h3>
          <p className="text-xs text-slate-500">
            총 지출: <span className="font-semibold text-slate-800">{formatCurrency(totalSpend)}</span>
          </p>
        </div>
        <div className="flex gap-3 items-end mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">날짜</label>
            <input
              type="date"
              value={spendForm.spend_date}
              onChange={(e) => setSpendForm({ ...spendForm, spend_date: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">지출 금액 (원)</label>
            <input
              type="number"
              value={spendForm.amount}
              onChange={(e) => setSpendForm({ ...spendForm, amount: e.target.value })}
              className="w-40 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="300000"
            />
          </div>
          <button
            onClick={addSpend}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
          >
            저장
          </button>
        </div>

        {spends.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">날짜</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">지출</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {spends.map((s) => (
                  <tr key={s.spend_date}>
                    <td className="px-4 py-2.5 text-slate-700">{s.spend_date}</td>
                    <td className="px-4 py-2.5 text-right text-slate-900 font-medium">
                      {formatCurrency(Number(s.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
