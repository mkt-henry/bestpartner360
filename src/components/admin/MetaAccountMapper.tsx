"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Link2, Unlink, RefreshCw } from "lucide-react"
import type { Brand, MetaAdAccount } from "@/types"

interface MetaAccount {
  id: string
  name: string
  account_status: number
}

interface Props {
  brands: Brand[]
  initialMappings: MetaAdAccount[]
}

export default function MetaAccountMapper({ brands, initialMappings }: Props) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [mappings, setMappings] = useState<MetaAdAccount[]>(initialMappings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedBrands, setSelectedBrands] = useState<Record<string, string>>({})

  useEffect(() => {
    const initial: Record<string, string> = {}
    for (const m of initialMappings) {
      initial[m.meta_account_id] = m.brand_id
    }
    setSelectedBrands(initial)
  }, [initialMappings])

  async function fetchAccounts() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/meta/accounts")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setAccounts(json.accounts)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Meta 계정을 불러오지 못했습니다")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAccounts() }, [])

  function getMappingForAccount(metaAccountId: string) {
    return mappings.find((m) => m.meta_account_id === metaAccountId)
  }

  async function handleLink(account: MetaAccount) {
    const brandId = selectedBrands[account.id]
    if (!brandId) return

    setSaving(account.id)
    try {
      const res = await fetch("/api/admin/meta/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brandId,
          meta_account_id: account.id,
          meta_account_name: account.name,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.refresh()
      setMappings((prev) => {
        const filtered = prev.filter((m) => m.meta_account_id !== account.id)
        const brand = brands.find((b) => b.id === brandId)
        return [
          ...filtered,
          {
            id: "",
            brand_id: brandId,
            meta_account_id: account.id,
            meta_account_name: account.name,
            created_at: new Date().toISOString(),
            brand: brand,
          },
        ]
      })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "연결 실패")
    } finally {
      setSaving(null)
    }
  }

  async function handleUnlink(metaAccountId: string) {
    setSaving(metaAccountId)
    try {
      const res = await fetch("/api/admin/meta/mapping", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meta_account_id: metaAccountId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.refresh()
      setMappings((prev) => prev.filter((m) => m.meta_account_id !== metaAccountId))
      setSelectedBrands((prev) => {
        const next = { ...prev }
        delete next[metaAccountId]
        return next
      })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "연결 해제 실패")
    } finally {
      setSaving(null)
    }
  }

  const statusLabels: Record<number, string> = {
    1: "활성",
    2: "비활성",
    3: "미확인",
    7: "보류",
    8: "임시 비활성",
    9: "비활성 상태",
    100: "보류(폐쇄 요청)",
    101: "닫힘",
    201: "임시 비활성(사용자)",
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 에러 */}
      {error && (
        <div style={{ background: "#e5553b1a", color: "var(--bad)", fontSize: 12, padding: "10px 14px", borderRadius: 8, border: "1px solid #e5553b30" }}>
          {error}
        </div>
      )}

      {/* 새로고침 버튼 */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={fetchAccounts}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--dim)", transition: "color .15s" }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--text)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--dim)"}
        >
          <RefreshCw style={{ width: 13, height: 13, animation: loading ? "spin 1s linear infinite" : "none" }} />
          새로고침
        </button>
      </div>

      {/* 로딩 */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0", color: "var(--dim)" }}>
          <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite", marginRight: 8 }} />
          Meta 계정을 불러오는 중...
        </div>
      ) : (
        <div className="panel">
          <div className="p-head" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
            <h3>Meta 광고 계정 ({accounts.length}개)</h3>
            <span style={{ fontSize: 10, color: "var(--dim)", textTransform: "none", letterSpacing: "normal" }}>각 광고 계정을 브랜드에 연결하세요</span>
          </div>

          <div>
            {accounts.length === 0 ? (
              <p className="empty">연결된 Meta 계정이 없습니다</p>
            ) : (
              accounts.map((account, idx) => {
                const mapping = getMappingForAccount(account.id)
                const isSaving = saving === account.id

                return (
                  <div
                    key={account.id}
                    style={{
                      padding: "12px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                      borderBottom: idx < accounts.length - 1 ? "1px solid var(--line)" : "none",
                    }}
                  >
                    {/* 계정 정보 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {account.name}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: "var(--dim)", fontFamily: "var(--c-mono)" }}>{account.id}</span>
                        <span className={`tag ${account.account_status === 1 ? "good" : "neutral"}`}>
                          {statusLabels[account.account_status] ?? `상태: ${account.account_status}`}
                        </span>
                      </div>
                    </div>

                    {/* 매핑 UI */}
                    {mapping ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "var(--amber)", fontWeight: 500 }}>
                          {mapping.brand?.name ?? "브랜드"}
                        </span>
                        <button
                          onClick={() => handleUnlink(account.id)}
                          disabled={isSaving}
                          className="btn danger"
                          style={{ padding: "4px 8px", fontSize: 10, opacity: isSaving ? 0.5 : 1 }}
                        >
                          {isSaving ? (
                            <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                          ) : (
                            <Unlink style={{ width: 12, height: 12 }} />
                          )}
                          해제
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <select
                          value={selectedBrands[account.id] ?? ""}
                          onChange={(e) =>
                            setSelectedBrands((prev) => ({
                              ...prev,
                              [account.id]: e.target.value,
                            }))
                          }
                          className="form-select"
                          style={{ minWidth: 140, padding: "4px 8px", fontSize: 11 }}
                        >
                          <option value="">브랜드 선택</option>
                          {brands.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleLink(account)}
                          disabled={isSaving || !selectedBrands[account.id]}
                          className="btn primary"
                          style={{ padding: "4px 8px", fontSize: 10, opacity: (isSaving || !selectedBrands[account.id]) ? 0.5 : 1 }}
                        >
                          {isSaving ? (
                            <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                          ) : (
                            <Link2 style={{ width: 12, height: 12 }} />
                          )}
                          연결
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
