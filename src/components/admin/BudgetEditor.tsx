"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { Trash2, Plus } from "lucide-react"

interface Budget {
  id?: string
  period_start: string
  period_end: string
  total_budget: number
}

export default function BudgetEditor({
  campaignId,
  initialBudgets,
}: {
  campaignId: string
  initialBudgets: Budget[]
}) {
  const router = useRouter()
  const [budgets, setBudgets] = useState(initialBudgets)
  const [form, setForm] = useState({ period_start: "", period_end: "", total_budget: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function addBudget() {
    if (!form.period_start || !form.period_end || !form.total_budget) {
      setError("모든 항목을 입력해주세요.")
      return
    }
    setSaving(true)
    setError("")

    const res = await fetch("/api/admin/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaign_id: campaignId,
        period_start: form.period_start,
        period_end: form.period_end,
        total_budget: parseFloat(form.total_budget.replace(/,/g, "")),
      }),
    })

    const json = await res.json()
    if (res.ok) {
      setBudgets((prev) => [json, ...prev])
      setForm({ period_start: "", period_end: "", total_budget: "" })
      router.refresh()
    } else {
      setError(json.error ?? "저장 실패")
    }
    setSaving(false)
  }

  async function deleteBudget(id: string) {
    if (!confirm("이 예산을 삭제하시겠습니까?")) return
    const res = await fetch("/api/admin/budget", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setBudgets((prev) => prev.filter((b) => b.id !== id))
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">기간별 예산 추가</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">시작일</label>
            <input
              type="date"
              value={form.period_start}
              onChange={(e) => setForm({ ...form, period_start: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">종료일</label>
            <input
              type="date"
              value={form.period_end}
              onChange={(e) => setForm({ ...form, period_end: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">예산 (원)</label>
            <input
              type="number"
              value={form.total_budget}
              onChange={(e) => setForm({ ...form, total_budget: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
              placeholder="5000000"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

        <button
          onClick={addBudget}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          {saving ? "저장 중..." : "예산 추가"}
        </button>
      </div>

      {budgets.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">설정된 예산</p>
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">기간</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">예산</th>
                  <th className="w-10 px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {budgets.map((b, i) => (
                  <tr key={b.id ?? i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {b.period_start} ~ {b.period_end}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(Number(b.total_budget))}
                    </td>
                    <td className="px-4 py-3">
                      {b.id && (
                        <button
                          onClick={() => deleteBudget(b.id!)}
                          className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center py-4">설정된 예산이 없습니다.</p>
      )}
    </div>
  )
}
