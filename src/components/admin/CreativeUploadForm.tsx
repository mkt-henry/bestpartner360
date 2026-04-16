"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { STATUS_LABELS } from "@/types"
import type { CalendarEventStatus } from "@/types"
import { Upload } from "lucide-react"

const CHANNELS = ["Instagram", "Facebook", "Google", "Kakao", "Naver", "TikTok", "YouTube", "기타"]
const STATUSES: CalendarEventStatus[] = [
  "draft", "review_requested", "feedback_pending", "in_revision", "upload_scheduled", "completed"
]

interface Brand { id: string; name: string }
interface Campaign { id: string; name: string; brand_id: string; channel: string }

export default function CreativeUploadForm({
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
    asset_type: "image" as "image" | "video" | "banner" | "other",
    status: "review_requested" as CalendarEventStatus,
    description: "",
    scheduled_date: "",
  })
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const filteredCampaigns = form.brand_id
    ? campaigns.filter((c) => c.brand_id === form.brand_id)
    : campaigns

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.brand_id || !form.title) return
    setLoading(true)

    const supabase = createClient()

    // 소재 메타데이터 저장
    const { data: creative, error: creativeError } = await supabase
      .from("creatives")
      .insert({
        brand_id: form.brand_id,
        campaign_id: form.campaign_id || null,
        title: form.title,
        channel: form.channel || null,
        asset_type: form.asset_type,
        status: form.status,
        description: form.description || null,
        scheduled_date: form.scheduled_date || null,
      })
      .select()
      .single()

    if (creativeError || !creative) {
      alert("저장 실패: " + creativeError?.message)
      setLoading(false)
      return
    }

    // 파일 업로드 (있는 경우)
    if (file) {
      const ext = file.name.split(".").pop()
      const filePath = `creatives/${creative.id}/v1.${ext}`
      const { error: uploadError } = await supabase.storage
        .from("creative-assets")
        .upload(filePath, file)

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("creative-assets")
          .getPublicUrl(filePath)

        await supabase.from("creative_versions").insert({
          creative_id: creative.id,
          version_number: 1,
          file_path: filePath,
          file_url: urlData.publicUrl,
        })
      }
    }

    setForm({
      brand_id: form.brand_id,
      campaign_id: "",
      title: "",
      channel: "",
      asset_type: "image",
      status: "review_requested",
      description: "",
      scheduled_date: "",
    })
    setFile(null)
    router.refresh()
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
            <option value="">선택</option>
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
            <option value="">선택</option>
            {filteredCampaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.channel})</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="form-label">소재명 *</label>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          className="form-input"
          placeholder="예: 봄 시즌 메인 배너 v1"
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
          <label className="form-label">유형</label>
          <select
            value={form.asset_type}
            onChange={(e) => setForm({ ...form, asset_type: e.target.value as typeof form.asset_type })}
            className="form-select"
          >
            <option value="image">이미지</option>
            <option value="video">영상</option>
            <option value="banner">배너</option>
            <option value="other">기타</option>
          </select>
        </div>
        <div>
          <label className="form-label">상태</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as CalendarEventStatus })}
            className="form-select"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">업로드 예정일</label>
          <input
            type="date"
            value={form.scheduled_date}
            onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
            className="form-input"
          />
        </div>
      </div>

      <div>
        <label className="form-label">설명</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="form-textarea"
          placeholder="소재 목적, 타겟, 메시지 등을 설명해주세요."
        />
      </div>

      {/* File Upload */}
      <div>
        <label className="form-label">파일 첨부 (선택)</label>
        <label className="file-drop">
          <Upload style={{ width: 16, height: 16 }} />
          <span>{file ? file.name : "이미지 또는 영상 파일 선택"}</span>
          <input
            type="file"
            accept="image/*,video/*"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={loading} className="btn primary">
          {loading ? "등록 중..." : "소재 등록"}
        </button>
      </div>
    </form>
  )
}
