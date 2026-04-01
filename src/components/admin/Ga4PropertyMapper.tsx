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

  // 입력 폼 상태
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
      // 폼 초기화
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
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* 추가 폼 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            GA4 속성 추가
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            GA4 관리 &gt; 속성 설정에서 속성 ID를 확인할 수 있습니다
          </p>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                브랜드
              </label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <option value="">브랜드 선택</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Property ID
              </label>
              <input
                type="text"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                placeholder="123456789"
                className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                속성 이름
              </label>
              <input
                type="text"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="예: GVB-KOREA 웹사이트"
                className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                웹사이트 URL
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
              />
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            추가
          </button>
        </div>
      </div>

      {/* 현재 매핑 목록 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            연결된 GA4 속성 ({mappings.length}개)
          </h2>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {mappings.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">
              연결된 GA4 속성이 없습니다
            </p>
          ) : (
            mappings.map((m) => (
              <div
                key={m.property_id}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {m.property_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-400 font-mono">{m.property_id}</span>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {m.brand?.name ?? "브랜드"}
                    </span>
                    {m.website_url && (
                      <a href={m.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                        <ExternalLink className="w-3 h-3" />
                        {m.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(m.property_id)}
                  disabled={deleting === m.property_id}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                >
                  {deleting === m.property_id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
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
