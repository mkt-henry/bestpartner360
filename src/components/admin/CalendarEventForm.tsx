"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { STATUS_LABELS } from "@/types"
import type { CalendarEventStatus } from "@/types"

const CHANNELS = ["Instagram", "Facebook", "Google", "Kakao", "Naver", "TikTok", "YouTube", "전체", "기타"]
const ASSET_TYPES = ["이미지", "영상", "배너", "텍스트", "기타"]
const STATUSES: CalendarEventStatus[] = [
  "draft", "review_requested", "feedback_pending", "in_revision", "upload_scheduled", "completed"
]

interface Brand { id: string; name: string }
interface Campaign { id: string; name: string; brand_id: string; channel: string }

export default function CalendarEventForm({
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
    title: "",
    channel: "",
    asset_type: "",
    event_date: new Date().toISOString().slice(0, 10),
    status: "upload_scheduled" as CalendarEventStatus,
    description: "",
  })
  const [loading, setLoading] = useState(false)

  const filteredCampaigns = form.brand_id
    ? campaigns.filter((c) => c.brand_id === form.brand_id)
    : campaigns

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from("calendar_events").insert({
      brand_id: form.brand_id,
      campaign_id: form.campaign_id || null,
      title: form.title,
      channel: form.channel || null,
      asset_type: form.asset_type || null,
      event_date: form.event_date,
      status: form.status,
      description: form.description || null,
    })

    if (error) {
      alert("저장 실패: " + error.message)
    } else {
      setForm({ ...form, title: "", channel: "", asset_type: "", description: "" })
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="form-grid cols-2">
        <div>
          <label className="form-label">브랜드 *</label>
          <select
            value={form.brand_id}
            onChange={(e) => setForm({ ...form, brand_id: e.target.value, campaign_id: "" })}
            required
            className="form-select"
          >
            <option value="">브랜드 선택</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">캠페인 (선택)</label>
          <select
            value={form.campaign_id}
            onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}
            className="form-select"
          >
            <option value="">캠페인 선택</option>
            {filteredCampaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.channel})</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="form-label">제목 *</label>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          className="form-input"
          placeholder="예: 메타 봄 시즌 소재 업로드"
        />
      </div>

      <div className="form-grid cols-4">
        <div>
          <label className="form-label">채널</label>
          <select
            value={form.channel}
            onChange={(e) => setForm({ ...form, channel: e.target.value })}
            className="form-select"
          >
            <option value="">선택</option>
            {CHANNELS.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">소재 유형</label>
          <select
            value={form.asset_type}
            onChange={(e) => setForm({ ...form, asset_type: e.target.value })}
            className="form-select"
          >
            <option value="">선택</option>
            {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">날짜 *</label>
          <input
            type="date"
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            required
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">상태</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as CalendarEventStatus })}
            className="form-select"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="form-label">설명</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="form-textarea"
          placeholder="일정에 대한 설명을 입력하세요."
        />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={loading} className="btn primary">
          {loading ? "저장 중..." : "일정 등록"}
        </button>
      </div>
    </form>
  )
}
