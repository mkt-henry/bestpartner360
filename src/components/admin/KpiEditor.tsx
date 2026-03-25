"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
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
  campaign_id?: string
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
  const [customKey, setCustomKey] = useState("")
  const [customLabel, setCustomLabel] = useState("")
  const [customUnit, setCustomUnit] = useState("")

  function addPreset(preset: (typeof PRESET_METRICS)[0]) {
    if (kpis.some((k) => k.metric_key === preset.key)) return
    setKpis((prev) => [
      ...prev,
      {
        metric_key: preset.key,
        label: preset.label,
        unit: preset.unit,
        display_order: prev.length,
        is_visible: true,
      },
    ])
  }

  function addCustom() {
    if (!customKey.trim() || !customLabel.trim()) return
    if (kpis.some((k) => k.metric_key === customKey.trim())) return
    setKpis((prev) => [
      ...prev,
      {
        metric_key: customKey.trim(),
        label: customLabel.trim(),
        unit: customUnit.trim(),
        display_order: prev.length,
        is_visible: true,
      },
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
    const supabase = createClient()

    // 기존 삭제 후 재삽입
    await supabase.from("kpi_definitions").delete().eq("campaign_id", campaignId)

    if (kpis.length > 0) {
      const { error } = await supabase.from("kpi_definitions").insert(
        kpis.map((k, i) => ({
          campaign_id: campaignId,
          metric_key: k.metric_key,
          label: k.label,
          unit: k.unit,
          display_order: i,
          is_visible: k.is_visible,
        }))
      )
      if (error) {
        alert("저장 실패: " + error.message)
        setLoading(false)
        return
      }
    }

    router.refresh()
    setLoading(false)
    alert("저장되었습니다.")
  }

  const addedKeys = new Set(kpis.map((k) => k.metric_key))

  return (
    <div className="space-y-6">
      {/* Preset */}
      <div>
        <p className="text-xs font-medium text-slate-600 mb-2">프리셋 지표</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_METRICS.map((p) => (
            <button
              key={p.key}
              onClick={() => addPreset(p)}
              disabled={addedKeys.has(p.key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                addedKeys.has(p.key)
                  ? "border-blue-200 bg-blue-50 text-blue-600 cursor-default"
                  : "border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              {addedKeys.has(p.key) ? "✓ " : "+ "}{p.label} ({p.unit})
            </button>
          ))}
        </div>
      </div>

      {/* Custom */}
      <div>
        <p className="text-xs font-medium text-slate-600 mb-2">커스텀 지표 추가</p>
        <div className="flex gap-2">
          <input
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            placeholder="키 (영문, 예: avg_order_value)"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="이름 (예: 평균 주문금액)"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value)}
            placeholder="단위 (원, %, 회)"
            className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addCustom}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            추가
          </button>
        </div>
      </div>

      {/* KPI List */}
      {kpis.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">설정된 KPI ({kpis.length}개)</p>
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {kpis.map((k, i) => (
              <div key={k.metric_key} className="flex items-center gap-3 px-4 py-3 bg-white">
                <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900">{k.label}</span>
                  <span className="text-xs text-slate-400 ml-2">({k.metric_key})</span>
                  {k.unit && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded ml-2">
                      {k.unit}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => toggleVisible(i)}
                  className={`p-1.5 rounded transition ${
                    k.is_visible ? "text-blue-600 hover:bg-blue-50" : "text-slate-300 hover:bg-slate-100"
                  }`}
                  title={k.is_visible ? "숨기기" : "보이기"}
                >
                  {k.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => removeKpi(i)}
                  className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {kpis.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">
          KPI를 추가하지 않으면 Viewer 화면에서 성과 섹션이 숨겨집니다.
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
      >
        {loading ? "저장 중..." : "저장"}
      </button>
    </div>
  )
}
