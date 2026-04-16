"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Eye, EyeOff, GripVertical } from "lucide-react"

const PRESET_METRICS = [
  { key: "impressions", label: "노출", unit: "회" },
  { key: "clicks", label: "클릭", unit: "회" },
  { key: "spend", label: "광고비", unit: "원" },
  { key: "conversions", label: "전환", unit: "건" },
  { key: "revenue", label: "매출", unit: "원" },
  { key: "ctr", label: "CTR", unit: "%" },
  { key: "cpc", label: "CPC", unit: "원" },
  { key: "cpm", label: "CPM", unit: "원" },
  { key: "cpa", label: "CPA", unit: "원" },
  { key: "roas", label: "ROAS", unit: "%" },
]

interface KpiDef {
  id?: string
  metric_key: string
  label: string
  unit: string
  display_order: number
  is_visible: boolean
}

export default function KpiEditor({
  campaignId,
  initialKpis,
}: {
  campaignId: string
  initialKpis: KpiDef[]
}) {
  const router = useRouter()
  const [kpis, setKpis] = useState<KpiDef[]>(initialKpis)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [customKey, setCustomKey] = useState("")
  const [customLabel, setCustomLabel] = useState("")
  const [customUnit, setCustomUnit] = useState("")

  function addPreset(preset: (typeof PRESET_METRICS)[0]) {
    if (kpis.some((k) => k.metric_key === preset.key)) return
    setKpis((prev) => [
      ...prev,
      { metric_key: preset.key, label: preset.label, unit: preset.unit, display_order: prev.length, is_visible: true },
    ])
  }

  function addCustom() {
    if (!customKey.trim() || !customLabel.trim()) return
    if (kpis.some((k) => k.metric_key === customKey.trim())) return
    setKpis((prev) => [
      ...prev,
      { metric_key: customKey.trim(), label: customLabel.trim(), unit: customUnit.trim(), display_order: prev.length, is_visible: true },
    ])
    setCustomKey("")
    setCustomLabel("")
    setCustomUnit("")
  }

  function toggleVisible(idx: number) {
    setKpis((prev) => prev.map((k, i) => (i === idx ? { ...k, is_visible: !k.is_visible } : k)))
  }

  function removeKpi(idx: number) {
    setKpis((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    setLoading(true)
    setError("")

    const res = await fetch("/api/admin/kpi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_id: campaignId, kpis }),
    })

    if (res.ok) {
      router.push("/admin/campaigns")
      router.refresh()
    } else {
      const json = await res.json()
      setError(json.error ?? "저장 실패")
      setLoading(false)
    }
  }

  const addedKeys = new Set(kpis.map((k) => k.metric_key))

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Preset */}
      <div>
        <p className="form-label" style={{ marginBottom: 8 }}>프리셋 지표</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PRESET_METRICS.map((p) => (
            <button
              key={p.key}
              onClick={() => addPreset(p)}
              disabled={addedKeys.has(p.key)}
              style={{
                fontSize: 11,
                padding: "5px 10px",
                borderRadius: 5,
                border: "1px solid",
                borderColor: addedKeys.has(p.key) ? "var(--amber)" : "var(--line)",
                background: addedKeys.has(p.key) ? "var(--amber-dim)" : "var(--bg-2)",
                color: addedKeys.has(p.key) ? "var(--amber)" : "var(--text-2)",
                cursor: addedKeys.has(p.key) ? "default" : "pointer",
                transition: "all .15s",
              }}
            >
              {addedKeys.has(p.key) ? "✓ " : "+ "}{p.label} ({p.unit})
            </button>
          ))}
        </div>
      </div>

      {/* Custom */}
      <div>
        <p className="form-label" style={{ marginBottom: 8 }}>커스텀 지표 추가</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <input
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            placeholder="키 (영문, 예: avg_order)"
            className="form-input"
            style={{ flex: 1, minWidth: 0 }}
          />
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="이름 (예: 평균 주문금액)"
            className="form-input"
            style={{ flex: 1, minWidth: 0 }}
          />
          <input
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value)}
            placeholder="단위"
            className="form-input"
            style={{ width: 80 }}
          />
          <button
            onClick={addCustom}
            className="btn"
            style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
          >
            <Plus style={{ width: 13, height: 13 }} />
            추가
          </button>
        </div>
      </div>

      {/* KPI List */}
      {kpis.length > 0 ? (
        <div>
          <p className="form-label" style={{ marginBottom: 8 }}>설정된 KPI ({kpis.length}개)</p>
          <div className="panel" style={{ overflow: "hidden" }}>
            {kpis.map((k, i) => (
              <div
                key={k.metric_key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderBottom: i < kpis.length - 1 ? "1px solid var(--line)" : "none",
                  background: "var(--bg-1)",
                }}
              >
                <GripVertical style={{ width: 14, height: 14, color: "var(--dimmer)", cursor: "grab", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{k.label}</span>
                  <span style={{ fontSize: 10, color: "var(--dim)", marginLeft: 8 }}>({k.metric_key})</span>
                  {k.unit && (
                    <span className="tag neutral" style={{ marginLeft: 8 }}>{k.unit}</span>
                  )}
                </div>
                <button
                  onClick={() => toggleVisible(i)}
                  style={{
                    padding: 4,
                    borderRadius: 4,
                    color: k.is_visible ? "var(--amber)" : "var(--dimmer)",
                    flexShrink: 0,
                    transition: "color .15s",
                  }}
                  title={k.is_visible ? "숨기기" : "보이기"}
                >
                  {k.is_visible ? <Eye style={{ width: 14, height: 14 }} /> : <EyeOff style={{ width: 14, height: 14 }} />}
                </button>
                <button
                  onClick={() => removeKpi(i)}
                  style={{
                    padding: 4,
                    borderRadius: 4,
                    color: "var(--dimmer)",
                    flexShrink: 0,
                    transition: "color .15s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--bad)"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--dimmer)"}
                >
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "var(--dim)", textAlign: "center", padding: "16px 0" }}>
          KPI를 추가하지 않으면 Viewer 화면에서 성과 섹션이 숨겨집니다.
        </p>
      )}

      {error && <p className="form-error">{error}</p>}

      <button
        onClick={handleSave}
        disabled={loading}
        className="btn primary"
        style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.6 : 1 }}
      >
        {loading ? "저장 중..." : "저장하고 돌아가기"}
      </button>
    </div>
  )
}
