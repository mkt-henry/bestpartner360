"use client"

import { useEffect } from "react"
import { ExternalLink } from "lucide-react"
import PlatformCredentialsForm, { type CredentialPlatform } from "@/components/admin/PlatformCredentialsForm"
import { getProviderMetadata } from "@/lib/providers/public"
import type { ProviderId } from "@/lib/providers/types"

interface BrandConnectionModalProps {
  open: boolean
  provider: ProviderId | null
  ga4Connected: boolean
  onClose: () => void
  onSaved: (provider: CredentialPlatform) => void
}

export default function BrandConnectionModal({
  open,
  provider,
  ga4Connected,
  onClose,
  onSaved,
}: BrandConnectionModalProps) {
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose, open])

  if (!open || !provider) return null

  const meta = getProviderMetadata(provider)
  if (!meta) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="brand-connection-modal-title"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(3, 5, 8, 0.74)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          maxHeight: "min(88vh, 900px)",
          overflowY: "auto",
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: 18,
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.42)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            padding: "22px 24px 18px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            <div
              id="brand-connection-modal-title"
              style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}
            >
              {meta.label}
            </div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6, lineHeight: 1.6 }}>
              {meta.description}
            </div>
            <a
              href={meta.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                color: "var(--accent)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginTop: 6,
              }}
            >
              <ExternalLink style={{ width: 12, height: 12 }} />
              {meta.helpLabel}
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "var(--bg-2)",
              color: "var(--text-2)",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {meta.authMode === "oauth" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: ga4Connected ? "1px solid #5ec27a33" : "1px solid var(--line)",
                  background: ga4Connected ? "#5ec27a12" : "var(--bg-2)",
                  color: ga4Connected ? "var(--good)" : "var(--text-2)",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                {ga4Connected
                  ? "현재 Google 계정이 연결되어 있습니다. 인증 오류가 보이면 다시 연결해서 토큰을 갱신하세요."
                  : "아직 Google 계정 연결이 없습니다. 먼저 연결을 완료해야 브랜드별 GA4 속성을 선택할 수 있습니다."}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href="/api/admin/ga4/auth" className="btn primary">
                  {ga4Connected ? "Google 다시 연결" : "Google 계정 연결"}
                </a>
                <button type="button" onClick={onClose} className="btn">
                  닫기
                </button>
              </div>
            </div>
          ) : (
            <PlatformCredentialsForm
              platforms={[provider as CredentialPlatform]}
              flat
              onSaved={(savedProvider) => {
                onSaved(savedProvider)
                onClose()
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
