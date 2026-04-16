"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Save } from "lucide-react"

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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Add Row */}
      <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 14, background: "var(--bg-2)" }}>
        <p className="form-label" style={{ marginBottom: 10 }}>날짜별 수치 입력</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label className="form-label">날짜</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="form-input"
            />
          </div>
          {kpiDefs.map((k) => (
            <div key={k.metric_key}>
              <label className="form-label">
                {k.label} {k.unit && <span style={{ color: "var(--dimmer)" }}>({k.unit})</span>}
              </label>
              <input
                type="number"
                value={newValues[k.metric_key]}
                onChange={(e) =>
                  setNewValues((prev) => ({ ...prev, [k.metric_key]: e.target.value }))
                }
                className="form-input"
                style={{ width: 110 }}
                placeholder="0"
              />
            </div>
          ))}
          <button
            onClick={handleAddOrUpdate}
            disabled={saving === "new"}
            className="btn primary"
            style={{ opacity: saving === "new" ? 0.6 : 1 }}
          >
            <Save style={{ width: 13, height: 13 }} />
            {saving === "new" ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {/* Record List */}
      {records.length > 0 && (
        <div className="panel">
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>날짜</th>
                  {kpiDefs.map((k) => (
                    <th key={k.metric_key} className="num">{k.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.record_date}>
                    <td style={{ color: "var(--text-2)" }}>{r.record_date}</td>
                    {kpiDefs.map((k) => (
                      <td key={k.metric_key} className="num" style={{ color: "var(--text-2)" }}>
                        {r.values[k.metric_key]?.toLocaleString("ko-KR") ?? "-"}
                        {r.values[k.metric_key] !== undefined && k.unit ? (
                          <span style={{ fontSize: 10, color: "var(--dim)", marginLeft: 2 }}>{k.unit}</span>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
