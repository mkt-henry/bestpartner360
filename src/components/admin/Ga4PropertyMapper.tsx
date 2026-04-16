"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2, ExternalLink } from "lucide-react"
import type { Brand, Ga4Property } from "@/types"

interface Props {
  brands: Brand[]
  initialMappings: Ga4Property[]
}

export default function Ga4PropertyMapper({ brands, initialMappings }: Props) {
  const router = useRouter()
  const [mappings, setMappings] = useState<Ga4Property[]>(initialMappings)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [brandId, setBrandId] = useState("")
  const [propertyId, setPropertyId] = useState("")
  const [propertyName, setPropertyName] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!brandId || !propertyId.trim() || !propertyName.trim()) {
      setError("모든 항목을 입력해주세요.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch("/api/admin/ga4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brandId,
          property_id: propertyId.trim(),
          property_name: propertyName.trim(),
          website_url: websiteUrl.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      router.refresh()
      const brand = brands.find((b) => b.id === brandId)
      setMappings((prev) => {
        const filtered = prev.filter((m) => m.property_id !== propertyId.trim())
        return [
          ...filtered,
          {
            id: "",
            brand_id: brandId,
            property_id: propertyId.trim(),
            property_name: propertyName.trim(),
            website_url: websiteUrl.trim() || null,
            created_at: new Date().toISOString(),
            brand,
          },
        ]
      })
      setBrandId("")
      setPropertyId("")
      setPropertyName("")
      setWebsiteUrl("")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "저장 실패")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(pid: string) {
    setDeleting(pid)
    try {
      const res = await fetch("/api/admin/ga4", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: pid }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.refresh()
      setMappings((prev) => prev.filter((m) => m.property_id !== pid))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "삭제 실패")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && (
        <div style={{ background: "#e5553b1a", color: "var(--bad)", fontSize: 12, padding: "10px 14px", borderRadius: 8, border: "1px solid #e5553b30" }}>
          {error}
        </div>
      )}

      {/* 추가 폼 */}
      <div className="panel">
        <div className="p-head" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
          <h3>GA4 속성 추가</h3>
          <span style={{ fontSize: 10, color: "var(--dim)", textTransform: "none", letterSpacing: "normal" }}>GA4 관리 &gt; 속성 설정에서 속성 ID를 확인할 수 있습니다</span>
        </div>

        <div className="p-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="form-grid cols-2">
            <div>
              <label className="form-label">브랜드</label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="form-select"
              >
                <option value="">브랜드 선택</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">속성 ID</label>
              <input
                type="text"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                placeholder="123456789"
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">속성 이름</label>
              <input
                type="text"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="예: GVB-KOREA 웹사이트"
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">웹사이트 URL</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="btn primary"
              style={{ opacity: saving ? 0.5 : 1 }}
            >
              {saving ? (
                <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
              ) : (
                <Plus style={{ width: 13, height: 13 }} />
              )}
              추가
            </button>
          </div>
        </div>
      </div>

      {/* 현재 매핑 목록 */}
      <div className="panel">
        <div className="p-head">
          <h3>연결된 GA4 속성 ({mappings.length}개)</h3>
        </div>

        <div>
          {mappings.length === 0 ? (
            <p className="empty">연결된 GA4 속성이 없습니다</p>
          ) : (
            mappings.map((m, idx) => (
              <div
                key={m.property_id}
                style={{
                  padding: "12px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  borderBottom: idx < mappings.length - 1 ? "1px solid var(--line)" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.property_name}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: "var(--dim)", fontFamily: "var(--c-mono)" }}>{m.property_id}</span>
                    <span style={{ fontSize: 10, color: "var(--amber)", fontWeight: 500 }}>
                      {m.brand?.name ?? "브랜드"}
                    </span>
                    {m.website_url && (
                      <a href={m.website_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 10, color: "var(--good)", textDecoration: "none" }}>
                        <ExternalLink style={{ width: 10, height: 10 }} />
                        {m.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(m.property_id)}
                  disabled={deleting === m.property_id}
                  className="btn danger"
                  style={{ padding: "4px 8px", fontSize: 10, opacity: deleting === m.property_id ? 0.5 : 1 }}
                >
                  {deleting === m.property_id ? (
                    <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                  ) : (
                    <Trash2 style={{ width: 12, height: 12 }} />
                  )}
                  삭제
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
