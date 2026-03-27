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
    <div className="space-y-6">
      {/* Preset */}
      <div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">프리셋 지표</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_METRICS.map((p) => (
            <button
              key={p.key}
              onClick={() => addPreset(p)}
              disabled={addedKeys.has(p.key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                addedKeys.has(p.key)
                  ? "border-blue-200 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 cursor-default"
                  : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              }`}
            >
              {addedKeys.has(p.key) ? "✓ " : "+ "}{p.label} ({p.unit})
            </button>
          ))}
        </div>
      </div>

      {/* Custom */}
      <div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">커스텀 지표 추가</p>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <input
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            placeholder="키 (영문, 예: avg_order)"
            className="flex-1 min-w-0 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
          />
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="이름 (예: 평균 주문금액)"
            className="flex-1 min-w-0 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
          />
          <input
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value)}
            placeholder="단위"
            className="w-20 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
          />
          <button
            onClick={addCustom}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1 flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            추가
          </button>
        </div>
      </div>

      {/* KPI List */}
      {kpis.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">설정된 KPI ({kpis.length}개)</p>
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
            {kpis.map((k, i) => (
              <div key={k.metric_key} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800">
                <GripVertical className="w-4 h-4 text-slate-300 cursor-grab flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{k.label}</span>
                  <span className="text-xs text-slate-400 ml-2 hidden sm:inline">({k.metric_key})</span>
                  {k.unit && (
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded ml-2">
                      {k.unit}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => toggleVisible(i)}
                  className={`p-1.5 rounded transition flex-shrink-0 ${
                    k.is_visible ? "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30" : "text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                  title={k.is_visible ? "숨기기" : "보이기"}
                >
                  {k.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => removeKpi(i)}
                  className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center py-4">
          KPI를 추가하지 않으면 Viewer 화면에서 성과 섹션이 숨겨집니다.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
      >
        {loading ? "저장 중..." : "저장하고 돌아가기"}
      </button>
    </div>
  )
}
