"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { X, Upload, Download } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { STATUS_LABELS } from "@/types"
import type {
  CalendarEvent,
  CalendarEventCreative,
  CalendarEventCreativeComment,
  CalendarEventStatus,
} from "@/types"

const CHANNELS = ["Instagram", "Facebook", "Google", "Kakao", "Naver", "Tistory", "TikTok", "YouTube", "전체", "기타"]
const STATUSES: CalendarEventStatus[] = [
  "draft", "in_review", "in_revision", "published",
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
  status: "draft" as CalendarEventStatus,
  description: "",
})

function stripExtension(name: string): string {
  const dot = name.lastIndexOf(".")
  return dot > 0 ? name.slice(0, dot) : name
}

function inferAssetType(file: File): "image" | "video" | "other" {
  if (file.type.startsWith("image/")) return "image"
  if (file.type.startsWith("video/")) return "video"
  return "other"
}

function orderLabel(n: number): string {
  return `${n}차`
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!mounted) return null

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

    const { error: dbError } = await supabase
      .from("calendar_events")
      .insert(payload)
      .select()
      .single()

    if (dbError) {
      setLoading(false)
      setError(dbError.message)
      return
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
                  placeholder="예: 제주도 2박 3일 여행 후기"
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
                    <option value="">채널 선택</option>
                    {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
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

            {state?.mode === "edit" && <VersionsSection event={state.event} />}
            {state?.mode === "create" && (
              <div
                style={{
                  borderTop: "1px solid var(--line)",
                  paddingTop: 14,
                  fontSize: 11,
                  color: "var(--dim)",
                }}
              >
                일정을 먼저 등록한 뒤, 편집 모드에서 소재 파일을 업로드하세요.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ──────────────────────────────────────────────────────────────
// VersionsSection — one creative per event, versioned
// ──────────────────────────────────────────────────────────────

function VersionsSection({ event }: { event: CalendarEvent }) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [pendingFileName, setPendingFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Treat the first creative as "the" creative for this event. The data
  // model allows multiple but the new admin workflow is 1:1.
  const creative: CalendarEventCreative | null = event.creatives?.[0] ?? null
  const versions = creative
    ? [...creative.creative_versions].sort((a, b) => a.version_number - b.version_number)
    : []
  const nextVersionNumber = versions.length > 0
    ? versions[versions.length - 1].version_number + 1
    : 1

  const commentsByVersion: Record<number, CalendarEventCreativeComment[]> = {}
  for (const c of creative?.creative_comments ?? []) {
    const v = c.version_number ?? 1
    if (!commentsByVersion[v]) commentsByVersion[v] = []
    commentsByVersion[v].push(c)
  }
  for (const v of Object.keys(commentsByVersion)) {
    commentsByVersion[Number(v)].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
  }

  async function uploadNextVersion(file: File) {
    setUploading(true)
    setPendingFileName(file.name)
    setError(null)
    const supabase = createClient()

    // Ensure a creative row exists
    let creativeId = creative?.id ?? null
    if (!creativeId) {
      const { data: created, error: creativeError } = await supabase
        .from("creatives")
        .insert({
          brand_id: event.brand_id,
          campaign_id: event.campaign_id,
          calendar_event_id: event.id,
          title: stripExtension(file.name),
          channel: event.channel,
          asset_type: inferAssetType(file),
          status: event.status,
          description: null,
          scheduled_date: event.event_date,
        })
        .select()
        .single()
      if (creativeError || !created) {
        setUploading(false)
        setError(creativeError?.message ?? "소재 엔트리 생성 실패")
        return
      }
      creativeId = created.id as string
    }

    const ext = file.name.split(".").pop() ?? "bin"
    const filePath = `creatives/${creativeId}/v${nextVersionNumber}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from("creative-assets")
      .upload(filePath, file)
    if (uploadError) {
      setUploading(false)
      setError(uploadError.message)
      return
    }
    const { data: urlData } = supabase.storage
      .from("creative-assets")
      .getPublicUrl(filePath)
    const { error: versionError } = await supabase.from("creative_versions").insert({
      creative_id: creativeId,
      version_number: nextVersionNumber,
      file_path: filePath,
      file_url: urlData.publicUrl,
      original_filename: file.name,
    })
    setUploading(false)
    setPendingFileName(null)
    if (versionError) {
      setError(versionError.message)
      return
    }
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
        <span className="sub" style={{ fontSize: 11 }}>
          {versions.length === 0 ? "아직 업로드된 버전 없음" : `${versions.length}차까지 전달됨`}
        </span>
      </div>

      {versions.length > 0 && (
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
          {versions.map((v, idx) => {
            const isLatest = idx === versions.length - 1
            const vComments = commentsByVersion[v.version_number] ?? []
            return (
              <li
                key={v.id}
                style={{
                  border: isLatest
                    ? "1px solid color-mix(in srgb, var(--amber) 35%, var(--line))"
                    : "1px solid var(--line)",
                  borderRadius: 8,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  background: "var(--bg-1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className="tag"
                    style={{
                      background: "var(--amber-dim)",
                      color: "var(--amber)",
                    }}
                  >
                    {orderLabel(v.version_number)}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {creative?.title ?? "소재"}
                    </div>
                    {v.original_filename && (
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--dim)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {v.original_filename}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--dim)" }}>
                    {new Date(v.uploaded_at).toLocaleDateString("ko-KR", {
                      month: "numeric", day: "numeric",
                    })}
                  </span>
                  <a
                    href={v.file_url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="btn"
                    style={{
                      fontSize: 10, padding: "3px 8px",
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}
                  >
                    <Download style={{ width: 11, height: 11 }} />
                    다운로드
                  </a>
                </div>

                <CommentList comments={vComments} />
              </li>
            )
          })}
        </ul>
      )}

      <label
        className="file-drop"
        style={{
          border: "1px dashed var(--line)",
          borderRadius: 8,
          padding: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: uploading ? "wait" : "pointer",
          opacity: uploading ? 0.6 : 1,
        }}
      >
        <Upload style={{ width: 14, height: 14 }} />
        <span
          style={{
            fontSize: 11,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 260,
          }}
        >
          {uploading && pendingFileName
            ? `업로드 중: ${pendingFileName}`
            : `${orderLabel(nextVersionNumber)} 버전 업로드`}
        </span>
        <input
          type="file"
          style={{ display: "none" }}
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) uploadNextVersion(f)
            e.target.value = ""
          }}
        />
      </label>

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

function CommentList({ comments }: { comments: CalendarEventCreativeComment[] }) {
  if (comments.length === 0) {
    return (
      <div
        style={{
          fontSize: 10,
          color: "var(--dim)",
          paddingTop: 6,
          borderTop: "1px solid var(--line)",
        }}
      >
        피드백 없음
      </div>
    )
  }
  return (
    <ul
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        margin: 0,
        padding: "8px 0 0 0",
        listStyle: "none",
        borderTop: "1px solid var(--line)",
      }}
    >
      {comments.map((c) => {
        const isAdmin = c.user_profiles?.role === "admin"
        return (
          <li
            key={c.id}
            style={{
              fontSize: 11,
              padding: "6px 8px",
              borderRadius: 6,
              background: isAdmin
                ? "color-mix(in srgb, var(--amber) 10%, var(--bg-1))"
                : "var(--bg-2)",
              border: "1px solid var(--line)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text)" }}>
                {c.user_profiles?.full_name ?? "사용자"}
              </span>
              {isAdmin && (
                <span style={{ fontSize: 9, color: "var(--amber)" }}>대행사</span>
              )}
              <span style={{ fontSize: 9, color: "var(--dim)", marginLeft: "auto" }}>
                {new Date(c.created_at).toLocaleString("ko-KR", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div style={{ color: "var(--text-2)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
              {c.content}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
