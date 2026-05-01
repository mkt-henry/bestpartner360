"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, Save, Trash2 } from "lucide-react"

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

export type CredentialPlatform = "meta" | "naver" | "ga4"

interface PlatformCredentialsFormProps {
  platforms?: CredentialPlatform[]
  flat?: boolean
  onSaved?: (platform: CredentialPlatform) => void
}

const platformConfig: Record<
  CredentialPlatform,
  { label: string; description: string; helpUrl: string; helpLabel: string; fields: FieldConfig[] }
> = {
  meta: {
    label: "Meta (Facebook / Instagram)",
    description: "Meta Business Suite에서 발급한 액세스 토큰을 DB에 저장합니다.",
    helpUrl: "https://developers.facebook.com/tools/explorer/",
    helpLabel: "Graph API Explorer",
    fields: [{ key: "access_token", label: "Access Token", placeholder: "EAAxxxxxxx..." }],
  },
  naver: {
    label: "네이버 검색광고",
    description: "네이버 검색광고 API 라이선스 키를 DB에 저장합니다.",
    helpUrl: "https://manage.searchad.naver.com/customers/START/tool/management",
    helpLabel: "검색광고 API 라이선스 관리",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "010000000050e04ece..." },
      { key: "secret_key", label: "Secret Key", placeholder: "AQAAAAD1GRmybWH..." },
      { key: "customer_id", label: "Customer ID", placeholder: "1655763" },
    ],
  },
  ga4: {
    label: "GA4 / Google OAuth",
    description: "GA4 연결과 토큰 갱신에 필요한 OAuth 클라이언트 키를 DB에 저장합니다.",
    helpUrl: "https://console.cloud.google.com/apis/credentials",
    helpLabel: "Google Cloud OAuth 클라이언트",
    fields: [
      { key: "client_id", label: "Client ID", placeholder: "xxxxx.apps.googleusercontent.com" },
      { key: "client_secret", label: "Client Secret", placeholder: "GOCSPX-xxxxxxx" },
    ],
  },
}

const emptyFormData: Record<CredentialPlatform, Record<string, string>> = {
  meta: { access_token: "" },
  naver: { api_key: "", secret_key: "", customer_id: "" },
  ga4: { client_id: "", client_secret: "" },
}

export default function PlatformCredentialsForm({
  platforms,
  flat = false,
  onSaved,
}: PlatformCredentialsFormProps = {}) {
  const [existing, setExisting] = useState<Partial<Record<CredentialPlatform, CredentialInfo>>>({})
  const [formData, setFormData] = useState<Record<CredentialPlatform, Record<string, string>>>(emptyFormData)
  const [saving, setSaving] = useState<CredentialPlatform | null>(null)
  const [deleting, setDeleting] = useState<CredentialPlatform | null>(null)
  const [success, setSuccess] = useState<CredentialPlatform | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})
  const [showReplaceForm, setShowReplaceForm] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  const visiblePlatforms =
    platforms && platforms.length > 0 ? platforms : (Object.keys(platformConfig) as CredentialPlatform[])
  const visibleConfigs = visiblePlatforms.map((platform) => [platform, platformConfig[platform]] as const)

  async function fetchCredentials() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/credentials")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)

      const map: Partial<Record<CredentialPlatform, CredentialInfo>> = {}
      for (const credential of json.credentials as CredentialInfo[]) {
        if (credential.platform in platformConfig) {
          map[credential.platform as CredentialPlatform] = credential
        }
      }
      setExisting(map)
    } catch (e: unknown) {
      setError(`인증 정보 로드 실패: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCredentials()
  }, [])

  function handleChange(platform: CredentialPlatform, key: string, value: string) {
    setFormData((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [key]: value },
    }))
  }

  async function handleSave(platform: CredentialPlatform) {
    const fields = platformConfig[platform].fields
    const credentials = formData[platform]
    const hasEmpty = fields.some((field) => !credentials[field.key]?.trim())

    if (hasEmpty) {
      setError("모든 필드를 입력해 주세요.")
      return
    }

    setSaving(platform)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch("/api/admin/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, credentials }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "저장 실패")

      setSuccess(platform)
      setFormData((prev) => ({
        ...prev,
        [platform]: Object.fromEntries(fields.map((field) => [field.key, ""])),
      }))
      setShowReplaceForm((prev) => ({ ...prev, [platform]: false }))
      await fetchCredentials()
      onSaved?.(platform)
      setTimeout(() => setSuccess(null), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "저장 실패")
    } finally {
      setSaving(null)
    }
  }

  async function handleDelete(platform: CredentialPlatform) {
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
      if (!res.ok) throw new Error(json.error ?? "삭제 실패")

      await fetchCredentials()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "삭제 실패")
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 0", color: "var(--dim)" }}>
        <Loader2 style={{ width: 20, height: 20, marginRight: 8, animation: "spin 1s linear infinite" }} />
        불러오는 중...
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: flat ? 16 : 24 }}>
      {error && (
        <div style={{ background: "color-mix(in srgb, var(--bad) 15%, transparent)", color: "var(--bad)", fontSize: 14, padding: "12px 16px", borderRadius: 8 }}>
          {error}
        </div>
      )}

      {visibleConfigs.map(([platform, config]) => {
        const info = existing[platform]
        const isSaving = saving === platform
        const isDeleting = deleting === platform
        const isSuccess = success === platform
        const isVisible = showValues[platform] ?? false
        const isReplacing = showReplaceForm[platform] ?? false

        const content = (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {info?.has_credentials && (
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dim)" }}>현재 DB에 저장됨</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => setShowValues((prev) => ({ ...prev, [platform]: !isVisible }))}
                      style={{ fontSize: 12, color: "var(--dim)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                      type="button"
                    >
                      {isVisible ? <EyeOff style={{ width: 12, height: 12 }} /> : <Eye style={{ width: 12, height: 12 }} />}
                      {isVisible ? "숨기기" : "보기"}
                    </button>
                    <button
                      onClick={() => handleDelete(platform)}
                      disabled={isDeleting}
                      style={{ fontSize: 12, color: "var(--bad)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                      type="button"
                    >
                      {isDeleting ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Trash2 style={{ width: 12, height: 12 }} />}
                      삭제
                    </button>
                  </div>
                </div>
                {isVisible && info.fields && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {Object.entries(info.fields).map(([key, maskedValue]) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <span style={{ color: "var(--dim)", width: 104 }}>{key}:</span>
                        <code style={{ color: "var(--text-2)", fontFamily: "monospace", wordBreak: "break-all" }}>{maskedValue}</code>
                      </div>
                    ))}
                  </div>
                )}
                <p style={{ fontSize: 12, color: "var(--dim)" }}>
                  마지막 수정: {new Date(info.updated_at).toLocaleString("ko-KR")}
                </p>
              </div>
            )}

            {info?.has_credentials && !isReplacing ? (
              <button
                onClick={() => setShowReplaceForm((prev) => ({ ...prev, [platform]: true }))}
                style={{ fontSize: 12, color: "var(--amber)", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                type="button"
              >
                새 키로 교체하기
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "var(--dim)" }}>
                    {info?.has_credentials ? "새 키로 교체" : "API 키 입력"}
                  </p>
                  {info?.has_credentials && (
                    <button
                      onClick={() => setShowReplaceForm((prev) => ({ ...prev, [platform]: false }))}
                      style={{ fontSize: 12, color: "var(--dim)", background: "none", border: "none", cursor: "pointer" }}
                      type="button"
                    >
                      취소
                    </button>
                  )}
                </div>
                {config.fields.map((field) => (
                  <div key={field.key}>
                    <label className="form-label">{field.label}</label>
                    <input
                      type="password"
                      value={formData[platform][field.key] ?? ""}
                      onChange={(event) => handleChange(platform, field.key, event.target.value)}
                      placeholder={field.placeholder}
                      className="form-input"
                    />
                  </div>
                ))}

                <button
                  onClick={() => handleSave(platform)}
                  disabled={isSaving}
                  className="btn primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", opacity: isSaving ? 0.5 : 1 }}
                  type="button"
                >
                  {isSaving ? (
                    <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                  ) : isSuccess ? (
                    <CheckCircle2 style={{ width: 14, height: 14 }} />
                  ) : (
                    <Save style={{ width: 14, height: 14 }} />
                  )}
                  {isSuccess ? "저장 완료" : "저장"}
                </button>
              </div>
            )}
          </div>
        )

        if (flat) {
          return (
            <div key={platform} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <h3 style={{ fontSize: 14, color: "var(--text)", marginBottom: 4 }}>{config.label}</h3>
                <p style={{ fontSize: 12, color: "var(--dim)" }}>{config.description}</p>
                <a href={config.helpUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <ExternalLink style={{ width: 12, height: 12 }} />
                  {config.helpLabel}
                </a>
              </div>
              {content}
            </div>
          )
        }

        return (
          <div key={platform} className="panel">
            <div className="p-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <h3>{config.label}</h3>
                <p style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{config.description}</p>
                <a href={config.helpUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <ExternalLink style={{ width: 12, height: 12 }} />
                  {config.helpLabel}
                </a>
              </div>
              {info?.has_credentials && <span className="status-pill">연결됨</span>}
            </div>
            <div className="p-body">{content}</div>
          </div>
        )
      })}
    </div>
  )
}
