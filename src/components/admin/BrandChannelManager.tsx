"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2, Link2, Unlink, Plus, Trash2, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react"
import type { Brand, MetaAdAccount, NaverAdAccount, Ga4Property } from "@/types"

// ── Meta 계정 (API에서 불러옴)
interface MetaAccount { id: string; name: string; account_status: number }
// ── 네이버 계정 (API에서 불러옴)
interface NaverAccount { id: string; name: string }

interface Props {
  brand: Brand
  metaMappings: MetaAdAccount[]
  naverMappings: NaverAdAccount[]
  ga4Mappings: Ga4Property[]
  ga4Connected?: boolean
}

const STATUS_LABELS: Record<number, string> = {
  1: "활성", 2: "비활성", 3: "미확인", 7: "보류",
}

export default function BrandChannelManager({ brand, metaMappings, naverMappings, ga4Mappings, ga4Connected }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── Meta state
  const [metaAccounts, setMetaAccounts] = useState<MetaAccount[]>([])
  const [metaLinked, setMetaLinked] = useState<MetaAdAccount[]>(metaMappings)
  const [metaLoading, setMetaLoading] = useState(false)
  const [metaSelected, setMetaSelected] = useState("")
  const [metaError, setMetaError] = useState<string | null>(null)

  // ── Naver state
  const [naverAccounts, setNaverAccounts] = useState<NaverAccount[]>([])
  const [naverLinked, setNaverLinked] = useState<NaverAdAccount[]>(naverMappings)
  const [naverLoading, setNaverLoading] = useState(false)
  const [naverSelected, setNaverSelected] = useState("")
  const [naverError, setNaverError] = useState<string | null>(null)

  // ── GA4 state
  interface Ga4Account { id: string; name: string; accountName: string }
  const [ga4Accounts, setGa4Accounts] = useState<Ga4Account[]>([])
  const [ga4Linked, setGa4Linked] = useState<Ga4Property[]>(ga4Mappings)
  const [ga4Loading, setGa4Loading] = useState(false)
  const [ga4Selected, setGa4Selected] = useState("")
  const [ga4Error, setGa4Error] = useState<string | null>(null)
  // 수동 입력 폴백
  const [ga4ManualMode, setGa4ManualMode] = useState(false)
  const [ga4PropertyId, setGa4PropertyId] = useState("")
  const [ga4PropertyName, setGa4PropertyName] = useState("")

  // ── Meta: fetch accounts
  async function fetchMetaAccounts() {
    setMetaLoading(true)
    setMetaError(null)
    try {
      const res = await fetch("/api/admin/meta/accounts")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setMetaAccounts(json.accounts ?? [])
    } catch (e: unknown) {
      setMetaError(e instanceof Error ? e.message : "Meta 계정 로드 실패")
    } finally {
      setMetaLoading(false)
    }
  }

  // ── Naver: fetch accounts
  async function fetchNaverAccounts() {
    setNaverLoading(true)
    setNaverError(null)
    try {
      const res = await fetch("/api/admin/naver/accounts")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setNaverAccounts(json.accounts ?? [])
    } catch (e: unknown) {
      setNaverError(e instanceof Error ? e.message : "네이버 계정 로드 실패")
    } finally {
      setNaverLoading(false)
    }
  }

  async function fetchGa4Properties() {
    setGa4Loading(true)
    setGa4Error(null)
    try {
      const res = await fetch("/api/admin/ga4/properties")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setGa4Accounts(json.properties ?? [])
    } catch (e: unknown) {
      setGa4Error(e instanceof Error ? e.message : "GA4 속성 로드 실패")
    } finally {
      setGa4Loading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchMetaAccounts()
      fetchNaverAccounts()
      if (ga4Connected) fetchGa4Properties()
    }
  }, [open])

  // ── Meta: link / unlink
  async function linkMeta() {
    if (!metaSelected) return
    const account = metaAccounts.find((a) => a.id === metaSelected)
    if (!account) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/meta/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: brand.id, meta_account_id: account.id, meta_account_name: account.name }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setMetaLinked((prev) => [...prev, { id: "", brand_id: brand.id, meta_account_id: account.id, meta_account_name: account.name, created_at: "", brand }])
      setMetaSelected("")
      router.refresh()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "연결 실패") }
    finally { setSaving(false) }
  }

  async function unlinkMeta(accountId: string) {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/meta/mapping", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ meta_account_id: accountId }) })
      if (!res.ok) throw new Error((await res.json()).error)
      setMetaLinked((prev) => prev.filter((m) => m.meta_account_id !== accountId))
      router.refresh()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "해제 실패") }
    finally { setSaving(false) }
  }

  // ── Naver: link / unlink
  async function linkNaver() {
    if (!naverSelected) return
    const account = naverAccounts.find((a) => a.id === naverSelected)
    if (!account) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/naver/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: brand.id, naver_customer_id: account.id, naver_account_name: account.name }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setNaverLinked((prev) => [...prev, { id: "", brand_id: brand.id, naver_customer_id: account.id, naver_account_name: account.name, created_at: "", brand }])
      setNaverSelected("")
      router.refresh()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "연결 실패") }
    finally { setSaving(false) }
  }

  async function unlinkNaver(customerId: string) {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/naver/mapping", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ naver_customer_id: customerId }) })
      if (!res.ok) throw new Error((await res.json()).error)
      setNaverLinked((prev) => prev.filter((m) => m.naver_customer_id !== customerId))
      router.refresh()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "해제 실패") }
    finally { setSaving(false) }
  }

  // ── GA4: link from dropdown
  async function linkGa4() {
    if (!ga4Selected) return
    const account = ga4Accounts.find((a) => a.id === ga4Selected)
    if (!account) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/ga4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: brand.id, property_id: account.id, property_name: account.name }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setGa4Linked((prev) => [...prev.filter((m) => m.property_id !== account.id), { id: "", brand_id: brand.id, property_id: account.id, property_name: account.name, website_url: null, created_at: "", brand }])
      setGa4Selected("")
      router.refresh()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "연결 실패") }
    finally { setSaving(false) }
  }

  // ── GA4: add manually
  async function addGa4() {
    if (!ga4PropertyId.trim() || !ga4PropertyName.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/ga4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: brand.id, property_id: ga4PropertyId.trim(), property_name: ga4PropertyName.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setGa4Linked((prev) => [...prev.filter((m) => m.property_id !== ga4PropertyId.trim()), { id: "", brand_id: brand.id, property_id: ga4PropertyId.trim(), property_name: ga4PropertyName.trim(), website_url: null, created_at: "", brand }])
      setGa4PropertyId("")
      setGa4PropertyName("")
      router.refresh()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "추가 실패") }
    finally { setSaving(false) }
  }

  async function removeGa4(propertyId: string) {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/ga4", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ property_id: propertyId }) })
      if (!res.ok) throw new Error((await res.json()).error)
      setGa4Linked((prev) => prev.filter((m) => m.property_id !== propertyId))
      router.refresh()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "삭제 실패") }
    finally { setSaving(false) }
  }

  // 연결된 매체 요약 뱃지
  const totalLinked = metaLinked.length + naverLinked.length + ga4Linked.length

  // available = API에서 불러온 계정 중 이미 다른 브랜드에 연결되지 않은 것들도 표시 (현 브랜드에 연결된 것은 제외)
  const availableMeta = metaAccounts.filter((a) => !metaLinked.some((m) => m.meta_account_id === a.id))
  const availableNaver = naverAccounts.filter((a) => !naverLinked.some((m) => m.naver_customer_id === a.id))

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
      {/* 브랜드 헤더 */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
      >
        <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
            {brand.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{brand.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {metaLinked.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">Meta {metaLinked.length}</span>}
            {naverLinked.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium">네이버 {naverLinked.length}</span>}
            {ga4Linked.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-medium">GA4 {ga4Linked.length}</span>}
            {totalLinked === 0 && <span className="text-[10px] text-slate-400">연결된 매체 없음</span>}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {/* 매체 연결 패널 */}
      {open && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-4 space-y-5">

          {/* ── Meta ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Meta</span>
              </div>
              <button onClick={fetchMetaAccounts} disabled={metaLoading} className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${metaLoading ? "animate-spin" : ""}`} /> 새로고침
              </button>
            </div>
            {metaError && <p className="text-xs text-red-500 mb-2">{metaError}</p>}

            {/* 연결된 Meta 계정 */}
            {metaLinked.map((m) => (
              <div key={m.meta_account_id} className="flex items-center gap-2 py-1.5">
                <span className="text-xs text-slate-900 dark:text-slate-100 font-medium flex-1 truncate">{m.meta_account_name}</span>
                <span className="text-[10px] text-slate-400 font-mono">{m.meta_account_id}</span>
                <button onClick={() => unlinkMeta(m.meta_account_id)} disabled={saving} className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5 disabled:opacity-50">
                  <Unlink className="w-3 h-3" /> 해제
                </button>
              </div>
            ))}

            {/* 새 연결 */}
            {metaLoading ? (
              <div className="flex items-center gap-1 py-2 text-xs text-slate-400"><Loader2 className="w-3 h-3 animate-spin" /> 로딩 중...</div>
            ) : availableMeta.length > 0 ? (
              <div className="flex items-center gap-2 mt-1">
                <select value={metaSelected} onChange={(e) => setMetaSelected(e.target.value)} className="flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                  <option value="">계정 선택</option>
                  {availableMeta.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({STATUS_LABELS[a.account_status] ?? a.account_status})</option>
                  ))}
                </select>
                <button onClick={linkMeta} disabled={saving || !metaSelected} className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50">
                  <Link2 className="w-3 h-3" /> 연결
                </button>
              </div>
            ) : !metaError && metaLinked.length === 0 ? (
              <p className="text-[10px] text-slate-400 py-1">API 설정에서 Meta 토큰을 먼저 등록하세요</p>
            ) : null}
          </div>

          <hr className="border-slate-100 dark:border-slate-700" />

          {/* ── 네이버 ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">네이버</span>
              </div>
              <button onClick={fetchNaverAccounts} disabled={naverLoading} className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${naverLoading ? "animate-spin" : ""}`} /> 새로고침
              </button>
            </div>
            {naverError && <p className="text-xs text-red-500 mb-2">{naverError}</p>}

            {naverLinked.map((m) => (
              <div key={m.naver_customer_id} className="flex items-center gap-2 py-1.5">
                <span className="text-xs text-slate-900 dark:text-slate-100 font-medium flex-1 truncate">{m.naver_account_name}</span>
                <span className="text-[10px] text-slate-400 font-mono">{m.naver_customer_id}</span>
                <button onClick={() => unlinkNaver(m.naver_customer_id)} disabled={saving} className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5 disabled:opacity-50">
                  <Unlink className="w-3 h-3" /> 해제
                </button>
              </div>
            ))}

            {naverLoading ? (
              <div className="flex items-center gap-1 py-2 text-xs text-slate-400"><Loader2 className="w-3 h-3 animate-spin" /> 로딩 중...</div>
            ) : availableNaver.length > 0 ? (
              <div className="flex items-center gap-2 mt-1">
                <select value={naverSelected} onChange={(e) => setNaverSelected(e.target.value)} className="flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                  <option value="">계정 선택</option>
                  {availableNaver.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <button onClick={linkNaver} disabled={saving || !naverSelected} className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 disabled:opacity-50">
                  <Link2 className="w-3 h-3" /> 연결
                </button>
              </div>
            ) : !naverError && naverLinked.length === 0 ? (
              <p className="text-[10px] text-slate-400 py-1">API 설정에서 네이버 키를 먼저 등록하세요</p>
            ) : null}
          </div>

          <hr className="border-slate-100 dark:border-slate-700" />

          {/* ── GA4 ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">GA4</span>
                {ga4Connected === true && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">연결됨</span>
                )}
              </div>
              {ga4Connected && (
                <button onClick={fetchGa4Properties} disabled={ga4Loading} className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1">
                  <RefreshCw className={`w-3 h-3 ${ga4Loading ? "animate-spin" : ""}`} /> 새로고침
                </button>
              )}
            </div>
            {ga4Error && <p className="text-xs text-red-500 mb-2">{ga4Error}</p>}

            {/* 연결된 GA4 속성 */}
            {ga4Linked.map((m) => (
              <div key={m.property_id} className="flex items-center gap-2 py-1.5">
                <span className="text-xs text-slate-900 dark:text-slate-100 font-medium flex-1 truncate">{m.property_name}</span>
                <span className="text-[10px] text-slate-400 font-mono">{m.property_id}</span>
                <button onClick={() => removeGa4(m.property_id)} disabled={saving} className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5 disabled:opacity-50">
                  <Unlink className="w-3 h-3" /> 해제
                </button>
              </div>
            ))}

            {/* Google 미연결 시 안내 */}
            {!ga4Connected && ga4Linked.length === 0 && (
              <p className="text-[10px] text-slate-400 py-1 mt-1">상단에서 Google 계정을 먼저 연결하세요</p>
            )}

            {/* Google 연결됨: 속성 선택 */}
            {ga4Connected && (
              <>
                {ga4Loading ? (
                  <div className="flex items-center gap-1 py-2 text-xs text-slate-400"><Loader2 className="w-3 h-3 animate-spin" /> 로딩 중...</div>
                ) : ga4Accounts.length > 0 && !ga4ManualMode ? (
                  <>
                    <div className="flex items-center gap-2 mt-1">
                      <select value={ga4Selected} onChange={(e) => setGa4Selected(e.target.value)} className="flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                        <option value="">속성 선택</option>
                        {ga4Accounts
                          .filter((a) => !ga4Linked.some((m) => m.property_id === a.id))
                          .map((a) => (
                            <option key={a.id} value={a.id}>[{a.accountName}] {a.name} ({a.id})</option>
                          ))}
                      </select>
                      <button onClick={linkGa4} disabled={saving || !ga4Selected} className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/40 disabled:opacity-50">
                        <Link2 className="w-3 h-3" /> 연결
                      </button>
                    </div>
                    <button onClick={() => setGa4ManualMode(true)} className="text-[10px] text-slate-400 hover:text-slate-600 mt-1">
                      직접 입력하기 →
                    </button>
                  </>
                ) : null}
              </>
            )}

            {/* 수동 입력 모드 */}
            {ga4ManualMode && (
              <>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={ga4PropertyId}
                    onChange={(e) => setGa4PropertyId(e.target.value)}
                    placeholder="Property ID"
                    className="w-28 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  />
                  <input
                    type="text"
                    value={ga4PropertyName}
                    onChange={(e) => setGa4PropertyName(e.target.value)}
                    placeholder="속성 이름"
                    className="flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  />
                  <button onClick={addGa4} disabled={saving || !ga4PropertyId.trim() || !ga4PropertyName.trim()} className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/40 disabled:opacity-50">
                    <Plus className="w-3 h-3" /> 추가
                  </button>
                </div>
                <button onClick={() => setGa4ManualMode(false)} className="text-[10px] text-slate-400 hover:text-slate-600 mt-1">
                  {ga4Connected ? "← 목록에서 선택하기" : "← 뒤로"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
