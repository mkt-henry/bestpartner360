"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Link2, Unlink, RefreshCw } from "lucide-react"
import type { Brand, NaverAdAccount } from "@/types"

interface NaverAccount {
  id: string
  name: string
}

interface Props {
  brands: Brand[]
  initialMappings: NaverAdAccount[]
}

export default function NaverAccountMapper({ brands, initialMappings }: Props) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<NaverAccount[]>([])
  const [mappings, setMappings] = useState<NaverAdAccount[]>(initialMappings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedBrands, setSelectedBrands] = useState<Record<string, string>>({})

  useEffect(() => {
    const initial: Record<string, string> = {}
    for (const m of initialMappings) {
      initial[m.naver_customer_id] = m.brand_id
    }
    setSelectedBrands(initial)
  }, [initialMappings])

  async function fetchAccounts() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/naver/accounts")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setAccounts(json.accounts)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "네이버 계정을 불러오지 못했습니다")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAccounts() }, [])

  function getMappingForAccount(customerId: string) {
    return mappings.find((m) => m.naver_customer_id === customerId)
  }

  async function handleLink(account: NaverAccount) {
    const brandId = selectedBrands[account.id]
    if (!brandId) return

    setSaving(account.id)
    try {
      const res = await fetch("/api/admin/naver/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brandId,
          naver_customer_id: account.id,
          naver_account_name: account.name,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.refresh()
      setMappings((prev) => {
        const filtered = prev.filter((m) => m.naver_customer_id !== account.id)
        const brand = brands.find((b) => b.id === brandId)
        return [
          ...filtered,
          {
            id: "",
            brand_id: brandId,
            naver_customer_id: account.id,
            naver_account_name: account.name,
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

  async function handleUnlink(customerId: string) {
    setSaving(customerId)
    try {
      const res = await fetch("/api/admin/naver/mapping", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naver_customer_id: customerId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.refresh()
      setMappings((prev) => prev.filter((m) => m.naver_customer_id !== customerId))
      setSelectedBrands((prev) => {
        const next = { ...prev }
        delete next[customerId]
        return next
      })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "연결 해제 실패")
    } finally {
      setSaving(null)
    }
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
          네이버 계정을 불러오는 중...
        </div>
      ) : (
        <div className="panel">
          <div className="p-head" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
            <h3>네이버 광고 계정 ({accounts.length}개)</h3>
            <span style={{ fontSize: 10, color: "var(--dim)", textTransform: "none", letterSpacing: "normal" }}>각 광고 계정을 브랜드에 연결하세요</span>
          </div>

          <div>
            {accounts.length === 0 ? (
              <p className="empty">연결된 네이버 계정이 없습니다</p>
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
                      <span style={{ fontSize: 10, color: "var(--dim)", fontFamily: "var(--c-mono)" }}>{account.id}</span>
                    </div>

                    {/* 매핑 UI */}
                    {mapping ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "var(--good)", fontWeight: 500 }}>
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
