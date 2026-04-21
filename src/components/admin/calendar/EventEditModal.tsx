"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { X, Upload } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { STATUS_LABELS } from "@/types"
import type { CalendarEvent, CalendarEventStatus } from "@/types"

const CHANNELS = ["Instagram", "Facebook", "Google", "Kakao", "Naver", "Tistory", "TikTok", "YouTube", "전체", "기타"]
const STATUSES: CalendarEventStatus[] = [
  "draft", "review_requested", "feedback_pending", "in_revision", "upload_scheduled", "completed",
]

interface Brand { id: string; name: string }
interface Campaign { id: string; name: string; brand_id: string; channel: string }

export type EventEditModalState =
  | { mode: "create"; initialDate?: string }
  | { mode: "edit"; event: CalendarEvent }

interface EventEditModalProps {
  state: EventEditModalState | null
  brands: Brand[]
  campaigns: Campaign[]
  onClose: () => void
}

const defaultForm = (initialDate?: string) => ({
  brand_id: "",
  campaign_id: "",
  title: "",
  channel: "",
  event_date: initialDate ?? new Date().toISOString().slice(0, 10),
  status: "upload_scheduled" as CalendarEventStatus,
  description: "",
})

type PendingCreative = {
  tempId: string
  title: string
  asset_type: "image" | "video" | "other"
  file: File
}

type CreativeInsertPayload = {
  brand_id: string
  campaign_id: string | null
  calendar_event_id?: string
  title: string
  channel: string | null
  asset_type: "image" | "video" | "other"
  status: CalendarEventStatus
  description: null
  scheduled_date: string
}

function isMissingCalendarEventIdColumnError(error: { code?: string | null; message?: string | null } | null | undefined) {
  return error?.code === "42703" && (error.message ?? "").includes("calendar_event_id")
}

async function insertCreativeWithOptionalCalendarLink(
  supabase: ReturnType<typeof createClient>,
  payload: CreativeInsertPayload,
) {
  const primary = await supabase
    .from("creatives")
    .insert(payload)
    .select()
    .single()

  if (!isMissingCalendarEventIdColumnError(primary.error)) {
    return primary
  }

  const fallbackPayload = { ...payload }
  delete fallbackPayload.calendar_event_id
  return supabase
    .from("creatives")
    .insert(fallbackPayload)
    .select()
    .single()
}

export default function EventEditModal({ state, brands, campaigns, onClose }: EventEditModalProps) {
  const router = useRouter()
  const open = !!state
  const isEdit = state?.mode === "edit"

  const stateKey = !state
    ? null
    : state.mode === "edit"
      ? `edit:${state.event.id}`
      : `create:${state.initialDate ?? "new"}`

  const [form, setForm] = useState(defaultForm())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prevStateKey, setPrevStateKey] = useState<string | null>(null)
  const [pendingCreatives, setPendingCreatives] = useState<PendingCreative[]>([])

  if (stateKey !== prevStateKey) {
    setPrevStateKey(stateKey)
    if (state) {
      if (state.mode === "edit") {
        const e = state.event
        setForm({
          brand_id: e.brand_id,
          campaign_id: e.campaign_id ?? "",
          title: e.title,
          channel: e.channel ?? "",
          event_date: e.event_date,
          status: e.status,
          description: e.description ?? "",
        })
      } else {
        setForm(defaultForm(state.initialDate))
      }
      setError(null)
      setPendingCreatives([])
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (typeof window === "undefined") return null

  const filteredCampaigns = form.brand_id
    ? campaigns.filter((c) => c.brand_id === form.brand_id)
    : campaigns

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!state) return
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const payload = {
      brand_id: form.brand_id,
      campaign_id: form.campaign_id || null,
      title: form.title,
      channel: form.channel || null,
      asset_type: null,
      event_date: form.event_date,
      status: form.status,
      description: form.description || null,
    }

    if (state.mode === "edit") {
      const { error: dbError } = await supabase
        .from("calendar_events")
        .update(payload)
        .eq("id", state.event.id)
      setLoading(false)
      if (dbError) {
        setError(dbError.message)
        return
      }
      router.refresh()
      onClose()
      return
    }

    const { data: created, error: dbError } = await supabase
      .from("calendar_events")
      .insert(payload)
      .select()
      .single()

    if (dbError || !created) {
      setLoading(false)
      setError(dbError?.message ?? "일정 등록 실패")
      return
    }

    for (const pc of pendingCreatives) {
      const { data: creative, error: creativeError } = await insertCreativeWithOptionalCalendarLink(supabase, {
        brand_id: form.brand_id,
        campaign_id: form.campaign_id || null,
        calendar_event_id: created.id,
        title: pc.title,
        channel: form.channel || null,
        asset_type: pc.asset_type,
        status: form.status,
        description: null,
        scheduled_date: form.event_date,
      })

      if (creativeError || !creative) {
        setLoading(false)
        setError(`소재 "${pc.title}" 등록 실패: ${creativeError?.message ?? ""}`)
        return
      }

      const ext = pc.file.name.split(".").pop() ?? "bin"
      const filePath = `creatives/${creative.id}/v1.${ext}`
      const { error: uploadError } = await supabase.storage
        .from("creative-assets")
        .upload(filePath, pc.file)
      if (uploadError) {
        setLoading(false)
        setError(`소재 "${pc.title}" 업로드 실패: ${uploadError.message}`)
        return
      }
      const { data: urlData } = supabase.storage
        .from("creative-assets")
        .getPublicUrl(filePath)
      const { error: versionError } = await supabase
        .from("creative_versions")
        .insert({
          creative_id: creative.id,
          version_number: 1,
          file_path: filePath,
          file_url: urlData.publicUrl,
        })
      if (versionError) {
        setLoading(false)
        setError(`소재 "${pc.title}" 버전 저장 실패: ${versionError.message}`)
        return
      }
    }

    setLoading(false)
    router.refresh()
    onClose()
  }

  async function handleDelete() {
    if (!state || state.mode !== "edit") return
    if (!window.confirm("이 일정을 삭제하시겠습니까?")) return
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: dbError } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", state.event.id)
    setLoading(false)
    if (dbError) {
      setError(dbError.message)
      return
    }
    router.refresh()
    onClose()
  }

  return createPortal(
    <div className="console-scope">
      <div
        className={`modal-bg ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`modal ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "일정 편집" : "새 일정"}
        style={{
          gridTemplateColumns: "1fr",
          inset: "8vh 12vw",
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        <div className="modal-right">
          <header className="modal-head">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="src-tag">
                <span>{isEdit ? "편집" : "새로 만들기"}</span>
              </div>
              <h2>
                일정 <em>{isEdit ? "편집" : "등록"}</em>
              </h2>
              <div className="sub">
                {form.event_date}
              </div>
            </div>
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label="닫기"
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </header>

          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
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

            <div className="form-grid cols-3">
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
                rows={3}
                className="form-textarea"
                placeholder="일정에 대한 설명을 입력하세요."
              />
            </div>

            {error && (
              <div style={{
                fontSize: 11,
                color: "var(--bad)",
                padding: "8px 10px",
                border: "1px solid color-mix(in srgb, var(--bad) 40%, var(--line))",
                borderRadius: 6,
                background: "color-mix(in srgb, var(--bad) 6%, transparent)",
              }}>
                저장 실패: {error}
              </div>
            )}

            <div
              className="form-actions"
              style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}
            >
              {isEdit && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="btn"
                  style={{ color: "var(--bad)", borderColor: "color-mix(in srgb, var(--bad) 40%, var(--line))" }}
                >
                  삭제
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn primary"
              >
                {loading ? "저장 중..." : isEdit ? "변경사항 저장" : "일정 등록"}
              </button>
            </div>
          </form>

          {state?.mode === "edit" && <CreativeSection event={state.event} />}
          {state?.mode === "create" && (
            <PendingCreativesSection
              items={pendingCreatives}
              onAdd={(pc) => setPendingCreatives((prev) => [...prev, pc])}
              onRemove={(tempId) =>
                setPendingCreatives((prev) => prev.filter((c) => c.tempId !== tempId))
              }
              disabled={loading}
            />
          )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function inferAssetType(file: File): "image" | "video" | "other" {
  if (file.type.startsWith("image/")) return "image"
  if (file.type.startsWith("video/")) return "video"
  return "other"
}

function CreativeSection({ event }: { event: CalendarEvent }) {
  const router = useRouter()
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newLoading, setNewLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const creatives = event.creatives ?? []

  async function addVersion(creativeId: string, currentCount: number, file: File) {
    setUploadingId(creativeId)
    setError(null)
    const supabase = createClient()
    const versionNumber = currentCount + 1
    const ext = file.name.split(".").pop() ?? "bin"
    const filePath = `creatives/${creativeId}/v${versionNumber}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from("creative-assets")
      .upload(filePath, file)
    if (uploadError) {
      setError(uploadError.message)
      setUploadingId(null)
      return
    }
    const { data: urlData } = supabase.storage
      .from("creative-assets")
      .getPublicUrl(filePath)
    const { error: versionError } = await supabase.from("creative_versions").insert({
      creative_id: creativeId,
      version_number: versionNumber,
      file_path: filePath,
      file_url: urlData.publicUrl,
    })
    setUploadingId(null)
    if (versionError) {
      setError(versionError.message)
      return
    }
    router.refresh()
  }

  async function addCreative() {
    if (!newTitle || !newFile) return
    setNewLoading(true)
    setError(null)
    const supabase = createClient()
    const { data: creative, error: creativeError } = await insertCreativeWithOptionalCalendarLink(supabase, {
      brand_id: event.brand_id,
      campaign_id: event.campaign_id,
      calendar_event_id: event.id,
      title: newTitle,
      channel: event.channel,
      asset_type: inferAssetType(newFile),
      status: event.status,
      description: null,
      scheduled_date: event.event_date,
    })
    if (creativeError || !creative) {
      setError(creativeError?.message ?? "소재 등록 실패")
      setNewLoading(false)
      return
    }
    const ext = newFile.name.split(".").pop() ?? "bin"
    const filePath = `creatives/${creative.id}/v1.${ext}`
    const { error: uploadError } = await supabase.storage
      .from("creative-assets")
      .upload(filePath, newFile)
    if (uploadError) {
      setError(uploadError.message)
      setNewLoading(false)
      return
    }
    const { data: urlData } = supabase.storage
      .from("creative-assets")
      .getPublicUrl(filePath)
    const { error: versionError } = await supabase.from("creative_versions").insert({
      creative_id: creative.id,
      version_number: 1,
      file_path: filePath,
      file_url: urlData.publicUrl,
    })
    setNewLoading(false)
    if (versionError) {
      setError(versionError.message)
      return
    }
    setNewTitle("")
    setNewFile(null)
    router.refresh()
  }

  return (
    <section
      style={{
        borderTop: "1px solid var(--line)",
        paddingTop: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.02em", margin: 0 }}>
          소재 전달
        </h3>
        <span className="sub" style={{ fontSize: 11 }}>{creatives.length}건</span>
      </div>

      {creatives.length > 0 && (
        <ul
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {creatives.map((c) => {
            const versions = [...c.creative_versions].sort(
              (a, b) => b.version_number - a.version_number,
            )
            const latest = versions[0]
            return (
              <li
                key={c.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  background: "var(--bg-1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="tag">{c.asset_type}</span>
                  <div style={{ fontSize: 12, fontWeight: 500, flex: 1, minWidth: 0 }}>
                    {c.title}
                  </div>
                  {latest ? (
                    <a
                      href={latest.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn"
                      style={{ fontSize: 10, padding: "3px 8px" }}
                    >
                      v{latest.version_number} 다운로드
                    </a>
                  ) : (
                    <span className="sub" style={{ fontSize: 10 }}>버전 없음</span>
                  )}
                </div>
                {versions.length > 1 && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--muted)",
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    이전 버전:{" "}
                    {versions.slice(1).map((v) => (
                      <a
                        key={v.id}
                        href={v.file_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--muted)", textDecoration: "underline" }}
                      >
                        v{v.version_number}
                      </a>
                    ))}
                  </div>
                )}
                <label className="file-drop" style={{ fontSize: 10, padding: "4px 8px" }}>
                  <Upload style={{ width: 12, height: 12 }} />
                  <span>
                    {uploadingId === c.id ? "업로드 중..." : "새 버전 업로드"}
                  </span>
                  <input
                    type="file"
                    style={{ display: "none" }}
                    disabled={uploadingId === c.id}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) addVersion(c.id, versions.length, f)
                      e.target.value = ""
                    }}
                  />
                </label>
              </li>
            )
          })}
        </ul>
      )}

      <div
        style={{
          border: "1px dashed var(--line)",
          borderRadius: 8,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 500 }}>새 소재 추가</div>
        <div>
          <label className="form-label">소재명</label>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="form-input"
            placeholder="예: 메인 배너 v1"
          />
        </div>
        <label className="file-drop">
          <Upload style={{ width: 14, height: 14 }} />
          <span>{newFile ? newFile.name : "파일 선택"}</span>
          <input
            type="file"
            style={{ display: "none" }}
            onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          type="button"
          onClick={addCreative}
          disabled={newLoading || !newTitle || !newFile}
          className="btn primary"
          style={{ alignSelf: "flex-start" }}
        >
          {newLoading ? "등록 중..." : "소재 등록"}
        </button>
      </div>

      {error && (
        <div
          style={{
            fontSize: 11,
            color: "var(--bad)",
            padding: "6px 10px",
            border: "1px solid color-mix(in srgb, var(--bad) 40%, var(--line))",
            borderRadius: 6,
            background: "color-mix(in srgb, var(--bad) 6%, transparent)",
          }}
        >
          오류: {error}
        </div>
      )}
    </section>
  )
}

function PendingCreativesSection({
  items,
  onAdd,
  onRemove,
  disabled,
}: {
  items: PendingCreative[]
  onAdd: (pc: PendingCreative) => void
  onRemove: (tempId: string) => void
  disabled?: boolean
}) {
  const [title, setTitle] = useState("")
  const [file, setFile] = useState<File | null>(null)

  function addItem() {
    if (!title || !file) return
    onAdd({
      tempId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      asset_type: inferAssetType(file),
      file,
    })
    setTitle("")
    setFile(null)
  }

  return (
    <section
      style={{
        borderTop: "1px solid var(--line)",
        paddingTop: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.02em", margin: 0 }}>
          소재 전달
        </h3>
        <span className="sub" style={{ fontSize: 11 }}>{items.length}건 대기</span>
      </div>

      <div style={{ fontSize: 11, color: "var(--muted)" }}>
        일정 저장 시 함께 업로드됩니다.
      </div>

      {items.length > 0 && (
        <ul
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {items.map((pc) => (
            <li
              key={pc.tempId}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--bg-1)",
              }}
            >
              <span className="tag">{pc.asset_type}</span>
              <div style={{ fontSize: 12, fontWeight: 500, flex: 1, minWidth: 0 }}>
                {pc.title}
              </div>
              <span style={{ fontSize: 10, color: "var(--dim)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {pc.file.name}
              </span>
              <button
                type="button"
                onClick={() => onRemove(pc.tempId)}
                disabled={disabled}
                className="btn"
                style={{ fontSize: 10, padding: "3px 8px" }}
                aria-label="제거"
              >
                제거
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        style={{
          border: "1px dashed var(--line)",
          borderRadius: 8,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 500 }}>새 소재 추가</div>
        <div>
          <label className="form-label">소재명</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
            placeholder="예: 메인 배너 v1"
          />
        </div>
        <label className="file-drop">
          <Upload style={{ width: 14, height: 14 }} />
          <span>{file ? file.name : "파일 선택"}</span>
          <input
            type="file"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          type="button"
          onClick={addItem}
          disabled={disabled || !title || !file}
          className="btn"
          style={{ alignSelf: "flex-start" }}
        >
          목록에 추가
        </button>
      </div>
    </section>
  )
}
