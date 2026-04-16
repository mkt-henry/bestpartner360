"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Send, Image as ImageIcon, Video } from "lucide-react"
import { STATUS_LABELS, STATUS_COLORS } from "@/types"
import type { CalendarEventStatus } from "@/types"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface CreativeVersion {
  id: string
  version_number: number
  file_url: string
  uploaded_at: string
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_profiles: { full_name: string | null; role: string } | null
}

interface Creative {
  id: string
  title: string
  channel: string | null
  asset_type: string
  status: string
  description: string | null
  scheduled_date: string | null
  creative_versions: CreativeVersion[]
  campaigns: { name: string } | null
}

interface Props {
  creative: Creative
  comments: Comment[]
  currentUserId: string
  isAdmin: boolean
}

export default function CreativeDetail({ creative, comments: initialComments, currentUserId, isAdmin }: Props) {
  const router = useRouter()
  const [comments, setComments] = useState(initialComments)
  const [newComment, setNewComment] = useState("")
  const [isPending, startTransition] = useTransition()
  const [selectedVersion, setSelectedVersion] = useState(
    creative.creative_versions?.sort((a, b) => b.version_number - a.version_number)[0] ?? null
  )

  const versions = creative.creative_versions?.sort((a, b) => b.version_number - a.version_number) ?? []

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim()) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from("creative_comments")
      .insert({ creative_id: creative.id, user_id: currentUserId, content: newComment.trim() })
      .select("id, content, created_at, user_profiles(full_name, role)")
      .single()

    if (!error && data) {
      setComments((prev) => [...prev, data as unknown as Comment])
      setNewComment("")
      startTransition(() => router.refresh())
    }
  }

  const status = creative.status as CalendarEventStatus

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back */}
      <Link
        href="/dashboard/creatives"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition"
      >
        <ChevronLeft className="w-4 h-4" />
        소재 목록
      </Link>

      <div className="flex gap-6">
        {/* Left: Preview */}
        <div className="flex-1">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Main Preview */}
            <div className="aspect-video bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
              {selectedVersion ? (
                creative.asset_type === "video" ? (
                  <video
                    src={selectedVersion.file_url}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedVersion.file_url}
                    alt={creative.title}
                    className="w-full h-full object-contain"
                  />
                )
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  {creative.asset_type === "video" ? (
                    <Video className="w-10 h-10" />
                  ) : (
                    <ImageIcon className="w-10 h-10" />
                  )}
                  <p className="text-sm">소재가 없습니다</p>
                </div>
              )}
            </div>

            {/* Version Selector */}
            {versions.length > 1 && (
              <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-700 flex gap-2 overflow-x-auto">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVersion(v)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-lg border flex-shrink-0 transition",
                      selectedVersion?.id === v.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    v{v.version_number}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mt-4 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">피드백</h3>

            <div className="space-y-3.5 mb-5">
              {comments.length === 0 ? (
                <p className="text-sm text-slate-400">아직 피드백이 없습니다.</p>
              ) : (
                comments.map((c) => {
                  const isMyComment = false // user_id 비교로 구현 가능
                  const isAdminComment = c.user_profiles?.role === "admin"
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "rounded-xl p-4 text-sm",
                        isAdminComment
                          ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800"
                          : "bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium",
                            isAdminComment ? "bg-blue-600 text-white" : "bg-slate-300 text-slate-700"
                          )}
                        >
                          {c.user_profiles?.full_name?.[0]?.toUpperCase() ?? "U"}
                        </div>
                        <span className="text-xs font-medium text-slate-700">
                          {c.user_profiles?.full_name ?? "사용자"}
                          {isAdminComment && (
                            <span className="ml-1.5 text-xs text-blue-600 font-normal">대행사</span>
                          )}
                        </span>
                        <span className="text-xs text-slate-400 ml-auto">
                          {new Date(c.created_at).toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-line">{c.content}</p>
                    </div>
                  )
                })
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleSubmitComment} className="flex gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="피드백을 남겨주세요..."
                rows={2}
                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    handleSubmitComment(e as unknown as React.FormEvent)
                  }
                }}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isPending}
                className="self-end px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition flex items-center gap-1.5 text-sm font-medium"
              >
                <Send className="w-3.5 h-3.5" />
                전송
              </button>
            </form>
          </div>
        </div>

        {/* Right: Info */}
        <div className="w-72 flex-shrink-0 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{creative.title}</h3>

            <div>
              <p className="text-xs text-slate-400 mb-1.5">상태</p>
              <span
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full font-medium",
                  STATUS_COLORS[status]
                )}
              >
                {STATUS_LABELS[status]}
              </span>
            </div>

            {creative.channel && (
              <div>
                <p className="text-xs text-slate-400 mb-1.5">채널</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{creative.channel}</p>
              </div>
            )}

            {creative.scheduled_date && (
              <div>
                <p className="text-xs text-slate-400 mb-1.5">업로드 예정</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{creative.scheduled_date}</p>
              </div>
            )}

            {creative.campaigns && (
              <div>
                <p className="text-xs text-slate-400 mb-1.5">캠페인</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{(creative.campaigns as { name: string }).name}</p>
              </div>
            )}

            {versions.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-1">버전</p>
                <p className="text-sm text-slate-700">v{versions[0].version_number} (최신)</p>
              </div>
            )}

            {creative.description && (
              <div>
                <p className="text-xs text-slate-400 mb-1">설명</p>
                <p className="text-sm text-slate-600 leading-relaxed">{creative.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
