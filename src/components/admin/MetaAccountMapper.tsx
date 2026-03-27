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

  // 매핑 정보로 초기 선택 상태 설정
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
      // 로컬 상태 업데이트
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
    <div className="space-y-4">
      {/* 에러 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* 새로고침 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={fetchAccounts}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </button>
      </div>

      {/* 로딩 */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Meta 계정을 불러오는 중...
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Meta 광고 계정 ({accounts.length}개)
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              각 광고 계정을 브랜드에 연결하세요
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {accounts.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">
                연결된 Meta 계정이 없습니다
              </p>
            ) : (
              accounts.map((account) => {
                const mapping = getMappingForAccount(account.id)
                const isSaving = saving === account.id

                return (
                  <div
                    key={account.id}
                    className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    {/* 계정 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {account.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400 font-mono">{account.id}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          account.account_status === 1
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {statusLabels[account.account_status] ?? `상태: ${account.account_status}`}
                        </span>
                      </div>
                    </div>

                    {/* 매핑 UI */}
                    {mapping ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                          {mapping.brand?.name ?? "브랜드"}
                        </span>
                        <button
                          onClick={() => handleUnlink(account.id)}
                          disabled={isSaving}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                        >
                          {isSaving ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Unlink className="w-3 h-3" />
                          )}
                          해제
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedBrands[account.id] ?? ""}
                          onChange={(e) =>
                            setSelectedBrands((prev) => ({
                              ...prev,
                              [account.id]: e.target.value,
                            }))
                          }
                          className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 min-w-[140px]"
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
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                        >
                          {isSaving ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Link2 className="w-3 h-3" />
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
