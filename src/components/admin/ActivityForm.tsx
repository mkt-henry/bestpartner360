"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const CHANNELS = ["Instagram", "Facebook", "Google", "Kakao", "Naver", "TikTok", "YouTube", "전체", "기타"]

interface Brand { id: string; name: string }
interface Campaign { id: string; name: string; brand_id: string; channel: string }

export default function ActivityForm({
  brands,
  campaigns,
}: {
  brands: Brand[]
  campaigns: Campaign[]
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    brand_id: "",
    campaign_id: "",
    channel: "",
    title: "",
    content: "",
    activity_date: new Date().toISOString().slice(0, 10),
  })
  const [loading, setLoading] = useState(false)

  const filteredCampaigns = form.brand_id
    ? campaigns.filter((c) => c.brand_id === form.brand_id)
    : campaigns

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from("activities").insert({
      brand_id: form.brand_id,
      campaign_id: form.campaign_id || null,
      channel: form.channel || null,
      title: form.title,
      content: form.content,
      activity_date: form.activity_date,
    })

    if (error) {
      alert("저장 실패: " + error.message)
    } else {
      setForm({
        brand_id: form.brand_id,
        campaign_id: "",
        channel: "",
        title: "",
        content: "",
        activity_date: new Date().toISOString().slice(0, 10),
      })
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">브랜드 *</label>
          <select
            value={form.brand_id}
            onChange={(e) => setForm({ ...form, brand_id: e.target.value, campaign_id: "" })}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">브랜드 선택</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">캠페인 (선택)</label>
          <select
            value={form.campaign_id}
            onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">캠페인 선택</option>
            {filteredCampaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.channel})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">채널 (선택)</label>
          <select
            value={form.channel}
            onChange={(e) => setForm({ ...form, channel: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">채널 선택</option>
            {CHANNELS.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">날짜 *</label>
          <input
            type="date"
            value={form.activity_date}
            onChange={(e) => setForm({ ...form, activity_date: e.target.value })}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">제목 *</label>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="예: 메타 캠페인 입찰 전략 변경"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">내용 *</label>
        <textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          required
          rows={4}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="고객이 이해할 수 있는 언어로 운영 내용을 설명해주세요."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
      >
        {loading ? "저장 중..." : "등록"}
      </button>
    </form>
  )
}
