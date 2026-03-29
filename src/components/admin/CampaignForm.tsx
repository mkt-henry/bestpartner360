"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const CHANNELS = ["Instagram", "Facebook", "Google", "Kakao", "Naver", "TikTok", "YouTube", "기타"]

interface Props {
  brands: { id: string; name: string }[]
  defaultBrandId?: string
}

export default function CampaignForm({ brands, defaultBrandId }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    brand_id: defaultBrandId ?? "",
    name: "",
    channel: "",
    start_date: "",
    end_date: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const supabase = createClient()
    const { data, error } = await supabase.from("campaigns").insert({
      brand_id: form.brand_id,
      name: form.name,
      channel: form.channel,
      status: "active",
      start_date: form.start_date,
      end_date: form.end_date || null,
    }).select("id").single()

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // 저장 후 KPI 설정 페이지로 바로 이동
      router.push(`/admin/campaigns/${data.id}/kpi`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">브랜드 *</label>
        <select
          value={form.brand_id}
          onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
          required
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-slate-100"
        >
          <option value="">브랜드 선택</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">매체 *</label>
        <select
          value={form.channel}
          onChange={(e) => setForm({ ...form, channel: e.target.value })}
          required
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-slate-100"
        >
          <option value="">매체 선택</option>
          {CHANNELS.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">매체명 *</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
          placeholder="예: Meta 브랜드광고"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">시작일 *</label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            required
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">종료일</label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
        >
          {loading ? "저장 중..." : "저장 후 KPI 설정"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium rounded-lg transition"
        >
          취소
        </button>
      </div>
    </form>
  )
}
