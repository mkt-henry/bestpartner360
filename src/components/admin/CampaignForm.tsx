"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const CHANNELS = ["Instagram", "Facebook", "Google", "Kakao", "Naver", "Tistory", "TikTok", "YouTube", "기타"]

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
    <form onSubmit={handleSubmit}>
      <div className="form-grid" style={{ marginBottom: "1rem" }}>
        <div>
          <label className="form-label">브랜드 *</label>
          <select
            value={form.brand_id}
            onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
            required
            className="form-select"
          >
            <option value="">브랜드 선택</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div>
          <label className="form-label">매체 *</label>
          <select
            value={form.channel}
            onChange={(e) => setForm({ ...form, channel: e.target.value })}
            required
            className="form-select"
          >
            <option value="">매체 선택</option>
            {CHANNELS.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
          </select>
        </div>

        <div>
          <label className="form-label">매체명 *</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="form-input"
            placeholder="예: Meta 브랜드광고"
          />
        </div>

        <div className="form-grid cols-2">
          <div>
            <label className="form-label">시작일 *</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              required
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">종료일</label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="form-input"
            />
          </div>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button
          type="submit"
          disabled={loading}
          className="btn primary"
        >
          {loading ? "저장 중..." : "저장 후 KPI 설정"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn"
        >
          취소
        </button>
      </div>
    </form>
  )
}
