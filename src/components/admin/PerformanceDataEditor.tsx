"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Plus, Save } from "lucide-react"

interface KpiDef {
  metric_key: string
  label: string
  unit: string
}

interface PerfRecord {
  record_date: string
  values: { [key: string]: number }
}

export default function PerformanceDataEditor({
  campaignId,
  kpiDefs,
  initialRecords,
}: {
  campaignId: string
  kpiDefs: KpiDef[]
  initialRecords: PerfRecord[]
}) {
  const router = useRouter()
  const [records, setRecords] = useState<PerfRecord[]>(initialRecords)
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10))
  const [newValues, setNewValues] = useState<Record<string, string>>(
    Object.fromEntries(kpiDefs.map((k) => [k.metric_key, ""]))
  )
  const [saving, setSaving] = useState<string | null>(null)

  async function handleAddOrUpdate() {
    if (!newDate) return
    setSaving("new")

    const values: { [key: string]: number } = {}
    for (const [k, v] of Object.entries(newValues)) {
      const num = parseFloat((v as string).replace(/,/g, ""))
      if (!isNaN(num)) values[k] = num
    }

    const supabase = createClient()
    const { error } = await supabase.from("performance_records").upsert(
      { campaign_id: campaignId, record_date: newDate, values },
      { onConflict: "campaign_id,record_date" }
    )

    if (!error) {
      setRecords((prev) => {
        const idx = prev.findIndex((r) => r.record_date === newDate)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = { record_date: newDate, values }
          return next
        }
        return [{ record_date: newDate, values }, ...prev]
      })
      setNewValues(Object.fromEntries(kpiDefs.map((k) => [k.metric_key, ""])))
      router.refresh()
    } else {
      alert("저장 실패: " + error.message)
    }
    setSaving(null)
  }

  return (
    <div className="space-y-5">
      {/* Add Row */}
      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
        <p className="text-xs font-medium text-slate-600 mb-3">날짜별 수치 입력</p>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">날짜</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          {kpiDefs.map((k) => (
            <div key={k.metric_key}>
              <label className="block text-xs text-slate-500 mb-1">
                {k.label} {k.unit && <span className="text-slate-400">({k.unit})</span>}
              </label>
              <input
                type="number"
                value={newValues[k.metric_key]}
                onChange={(e) =>
                  setNewValues((prev) => ({ ...prev, [k.metric_key]: e.target.value }))
                }
                className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="0"
              />
            </div>
          ))}
          <button
            onClick={handleAddOrUpdate}
            disabled={saving === "new"}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {saving === "new" ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {/* Record List */}
      {records.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">날짜</th>
                {kpiDefs.map((k) => (
                  <th key={k.metric_key} className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">
                    {k.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r) => (
                <tr key={r.record_date} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-2.5 text-slate-700">{r.record_date}</td>
                  {kpiDefs.map((k) => (
                    <td key={k.metric_key} className="px-4 py-2.5 text-right text-slate-700">
                      {r.values[k.metric_key]?.toLocaleString("ko-KR") ?? "-"}
                      {r.values[k.metric_key] !== undefined && k.unit ? (
                        <span className="text-xs text-slate-400 ml-0.5">{k.unit}</span>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
