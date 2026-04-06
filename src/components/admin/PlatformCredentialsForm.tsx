"use client"

import { useEffect, useState } from "react"
import { Loader2, Save, Trash2, Eye, EyeOff, CheckCircle2 } from "lucide-react"

interface CredentialInfo {
  platform: string
  updated_at: string
  has_credentials: boolean
  fields: Record<string, string>
}

interface FieldConfig {
  key: string
  label: string
  placeholder: string
}

const platformConfig: Record<string, { label: string; description: string; fields: FieldConfig[] }> = {
  meta: {
    label: "Meta (Facebook / Instagram)",
    description: "Meta Business Suite에서 발급한 액세스 토큰을 입력하세요.",
    fields: [
      { key: "access_token", label: "Access Token", placeholder: "EAAxxxxxxx..." },
    ],
  },
  naver: {
    label: "네이버 검색광고",
    description: "네이버 검색광고 API 라이선스 관리에서 발급한 키를 입력하세요.",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "API 키" },
      { key: "secret_key", label: "Secret Key", placeholder: "비밀 키" },
      { key: "customer_id", label: "Customer ID", placeholder: "고객 ID (숫자)" },
    ],
  },
}

export default function PlatformCredentialsForm() {
  const [existing, setExisting] = useState<Record<string, CredentialInfo>>({})
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({
    meta: { access_token: "" },
    naver: { api_key: "", secret_key: "", customer_id: "" },
  })
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})
  const [showReplaceForm, setShowReplaceForm] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  async function fetchCredentials() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/credentials")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      const map: Record<string, CredentialInfo> = {}
      for (const c of json.credentials) {
        map[c.platform] = c
      }
      setExisting(map)
    } catch (e: unknown) {
      setError(`자격증명 로드 실패: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCredentials() }, [])

  function handleChange(platform: string, key: string, value: string) {
    setFormData((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [key]: value },
    }))
  }

  async function handleSave(platform: string) {
    const fields = platformConfig[platform].fields
    const creds = formData[platform]

    // 모든 필드가 입력되었는지 확인
    const hasEmpty = fields.some((f) => !creds[f.key]?.trim())
    if (hasEmpty) {
      setError("모든 필드를 입력해주세요.")
      return
    }

    setSaving(platform)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch("/api/admin/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, credentials: creds }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setSuccess(platform)
      // 폼 초기화 및 교체 폼 닫기
      setFormData((prev) => ({
        ...prev,
        [platform]: Object.fromEntries(fields.map((f) => [f.key, ""])),
      }))
      setShowReplaceForm((prev) => ({ ...prev, [platform]: false }))
      await fetchCredentials()
      setTimeout(() => setSuccess(null), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "저장 실패")
    } finally {
      setSaving(null)
    }
  }

  async function handleDelete(platform: string) {
    if (!confirm(`${platformConfig[platform].label} API 키를 삭제하시겠습니까?`)) return

    setDeleting(platform)
    setError(null)

    try {
      const res = await fetch("/api/admin/credentials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      await fetchCredentials()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "삭제 실패")
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        불러오는 중...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {Object.entries(platformConfig).map(([platform, config]) => {
        const info = existing[platform]
        const isSaving = saving === platform
        const isDeleting = deleting === platform
        const isSuccess = success === platform
        const isVisible = showValues[platform] ?? false
        const isReplacing = showReplaceForm[platform] ?? false

        return (
          <div
            key={platform}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {config.label}
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {config.description}
                  </p>
                </div>
                {info?.has_credentials && (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    연결됨
                  </span>
                )}
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* 기존 키 정보 */}
              {info?.has_credentials && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      현재 저장된 키
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowValues((prev) => ({ ...prev, [platform]: !isVisible }))}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1"
                      >
                        {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {isVisible ? "숨기기" : "보기"}
                      </button>
                      <button
                        onClick={() => handleDelete(platform)}
                        disabled={isDeleting}
                        className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        삭제
                      </button>
                    </div>
                  </div>
                  {isVisible && info.fields && (
                    <div className="space-y-1">
                      {Object.entries(info.fields).map(([key, maskedValue]) => (
                        <div key={key} className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400 w-24">{key}:</span>
                          <code className="text-slate-600 dark:text-slate-300 font-mono">{maskedValue}</code>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-400">
                    마지막 수정: {new Date(info.updated_at).toLocaleString("ko-KR")}
                  </p>
                </div>
              )}

              {/* 입력 폼 */}
              {info?.has_credentials && !isReplacing ? (
                <button
                  onClick={() => setShowReplaceForm((prev) => ({ ...prev, [platform]: true }))}
                  className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  새 키로 교체하기
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {info?.has_credentials ? "새 키로 교체" : "API 키 입력"}
                    </p>
                    {info?.has_credentials && (
                      <button
                        onClick={() => setShowReplaceForm((prev) => ({ ...prev, [platform]: false }))}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        취소
                      </button>
                    )}
                  </div>
                  {config.fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {field.label}
                      </label>
                      <input
                        type="password"
                        value={formData[platform][field.key] ?? ""}
                        onChange={(e) => handleChange(platform, field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                    </div>
                  ))}

                  <button
                    onClick={() => handleSave(platform)}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isSuccess ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {isSuccess ? "저장 완료" : "저장"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
