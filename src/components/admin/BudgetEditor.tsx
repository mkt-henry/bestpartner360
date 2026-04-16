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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <p className="form-label" style={{ marginBottom: 10 }}>기간별 예산 추가</p>
        <div className="form-grid cols-3" style={{ marginBottom: 10 }}>
          <div>
            <label className="form-label">시작일</label>
            <input
              type="date"
              value={form.period_start}
              onChange={(e) => setForm({ ...form, period_start: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">종료일</label>
            <input
              type="date"
              value={form.period_end}
              onChange={(e) => setForm({ ...form, period_end: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">예산 (원)</label>
            <input
              type="number"
              value={form.total_budget}
              onChange={(e) => setForm({ ...form, total_budget: e.target.value })}
              className="form-input"
              placeholder="5000000"
            />
          </div>
        </div>

        {error && <p className="form-error" style={{ marginBottom: 8 }}>{error}</p>}

        <button
          onClick={addBudget}
          disabled={saving}
          className="btn primary"
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          {saving ? "저장 중..." : "예산 추가"}
        </button>
      </div>

      {budgets.length > 0 ? (
        <div>
          <p className="form-label" style={{ marginBottom: 8 }}>설정된 예산</p>
          <div className="panel">
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>기간</th>
                    <th className="num">예산</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.map((b, i) => (
                    <tr key={b.id ?? i}>
                      <td style={{ color: "var(--text-2)" }}>
                        {b.period_start} ~ {b.period_end}
                      </td>
                      <td className="num" style={{ fontWeight: 600, color: "var(--text)" }}>
                        {formatCurrency(Number(b.total_budget))}
                      </td>
                      <td>
                        {b.id && (
                          <button
                            onClick={() => deleteBudget(b.id!)}
                            style={{ padding: 4, borderRadius: 4, color: "var(--dimmer)", transition: "color .15s" }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "var(--bad)"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "var(--dimmer)"}
                          >
                            <Trash2 style={{ width: 13, height: 13 }} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "var(--dim)", textAlign: "center", padding: "16px 0" }}>설정된 예산이 없습니다.</p>
      )}
    </div>
  )
}
