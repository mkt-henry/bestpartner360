"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Brand, MetaAdAccount, NaverAdAccount, Ga4Property } from "@/types"
import BrandConnectionModal from "@/components/admin/BrandConnectionModal"
import { getLiveMediaPlatformCount } from "@/lib/media-platforms"

interface MetaAccount {
  id: string
  name: string
  account_status: number
}

interface NaverAccount {
  id: string
  name: string
}

interface Ga4Account {
  id: string
  name: string
  accountName: string
}

interface Props {
  brand: Brand
  metaMappings: MetaAdAccount[]
  naverMappings: NaverAdAccount[]
  ga4Mappings: Ga4Property[]
  ga4Connected?: boolean
  isLast?: boolean
}

type MediaTone = "connected" | "partial" | "empty" | "error"
type ModalProvider = "meta" | "naver" | "ga4" | null

const STATUS_LABELS: Record<number, string> = {
  1: "활성",
  2: "비활성",
  3: "미확인",
  7: "보류",
}

const MEDIA_TOTAL = getLiveMediaPlatformCount()

const s = {
  trigger: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "18px 20px",
    borderBottom: "1px solid var(--line)",
    background: "transparent",
    textAlign: "left" as const,
    transition: "background .15s, border-color .15s",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: "linear-gradient(135deg, #9fb7b2, #6e8e88)",
    display: "grid",
    placeItems: "center",
    color: "var(--bg)",
    fontSize: 22,
    fontWeight: 700,
    flexShrink: 0,
  },
  statusChip: (tone: MediaTone) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    border:
      tone === "connected"
        ? "1px solid #5ec27a33"
        : tone === "partial"
          ? "1px solid #8aa6a133"
          : tone === "error"
            ? "1px solid #e5553b33"
            : "1px solid var(--line)",
    background:
      tone === "connected"
        ? "#5ec27a14"
        : tone === "partial"
          ? "#8aa6a114"
          : tone === "error"
            ? "#e5553b14"
            : "var(--bg-2)",
    color:
      tone === "connected"
        ? "var(--good)"
        : tone === "partial"
          ? "var(--amber)"
          : tone === "error"
            ? "var(--bad)"
            : "var(--dim)",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: ".06em",
    textTransform: "uppercase" as const,
    whiteSpace: "nowrap" as const,
  }),
  statusDot: (color: string) => ({
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  }),
  mediaChip: (active: boolean, color: string) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 10px",
    borderRadius: 999,
    border: active ? `1px solid ${color}44` : "1px solid var(--line)",
    background: active ? `${color}18` : "var(--bg-2)",
    color: active ? color : "var(--dim)",
    fontSize: 10,
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
  }),
  mediaCard: {
    background: "color-mix(in srgb, var(--bg-2) 70%, var(--bg-1))",
    border: "1px solid color-mix(in srgb, var(--line) 84%, transparent)",
    borderRadius: 9,
    padding: 14,
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    minWidth: 0,
  },
  mediaHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingBottom: 10,
    borderBottom: "1px solid var(--line)",
  },
  mediaTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    minWidth: 0,
  },
  mediaIcon: (background: string, color: string) => ({
    width: 26,
    height: 26,
    borderRadius: 7,
    background,
    color,
    display: "grid",
    placeItems: "center",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  }),
  title: {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--text)",
  },
  subtitle: {
    fontSize: 10,
    color: "var(--dim)",
    marginTop: 2,
  },
  refreshBtn: {
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 9px",
    borderRadius: 7,
    border: "1px solid var(--line)",
    background: "var(--bg-1)",
    color: "var(--text-2)",
    fontSize: 10,
    fontWeight: 500,
  },
  list: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 7,
  },
  linkedItem: {
    display: "grid",
    gridTemplateColumns: "22px minmax(0, 1fr) auto auto",
    alignItems: "center",
    gap: 9,
    padding: "9px 10px",
    background: "var(--bg-1)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    minWidth: 0,
  },
  linkedName: {
    fontSize: 12,
    color: "var(--text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  linkedMeta: {
    fontSize: 10,
    color: "var(--dim)",
    fontFamily: "var(--c-mono)",
  },
  unlinkBtn: {
    padding: "4px 8px",
    borderRadius: 7,
    border: "1px solid #e5553b30",
    color: "var(--bad)",
    fontSize: 10,
    fontWeight: 600,
    flexShrink: 0,
  },
  notice: (tone: "error" | "empty" | "info") => ({
    padding: "9px 11px",
    borderRadius: 8,
    border:
      tone === "error"
        ? "1px solid #e5553b2d"
        : tone === "info"
          ? "1px solid #7db8d62d"
          : "1px solid var(--line)",
    background:
      tone === "error"
        ? "color-mix(in srgb, var(--bad) 10%, var(--bg-1))"
        : tone === "info"
          ? "color-mix(in srgb, var(--steel) 7%, var(--bg-1))"
          : "var(--bg-1)",
    color: tone === "error" ? "#ff9c8f" : tone === "info" ? "#9fc8dd" : "var(--dim)",
    fontSize: 10,
    lineHeight: 1.5,
  }),
  formRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap" as const,
  },
  select: {
    flex: 1,
    minWidth: 180,
    padding: "9px 11px",
    background: "var(--bg-1)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    color: "var(--text)",
    font: "inherit",
    fontSize: 11,
    outline: "none",
  },
  input: {
    minWidth: 140,
    padding: "9px 11px",
    background: "var(--bg-1)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    color: "var(--text)",
    font: "inherit",
    fontSize: 11,
    outline: "none",
  },
  secondaryAction: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: "var(--dim)",
    fontSize: 10,
    fontWeight: 500,
    marginTop: 2,
  },
}

function getMediaTone(hasLinked: boolean, hasError: boolean): MediaTone {
  if (hasError) return "error"
  if (hasLinked) return "connected"
  return "empty"
}

function renderToneLabel(tone: MediaTone) {
  if (tone === "connected") return "연결됨"
  if (tone === "partial") return "부분 연결"
  if (tone === "error") return "오류"
  return "미연결"
}

function toneDotColor(tone: MediaTone) {
  if (tone === "connected") return "var(--good)"
  if (tone === "partial") return "var(--amber)"
  if (tone === "error") return "var(--bad)"
  return "var(--dim)"
}

function formatProviderError(provider: "meta" | "naver" | "ga4", message: string) {
  const normalized = message.toLowerCase()

  if (provider === "meta") {
    if (normalized.includes("session has expired") || normalized.includes("access token")) {
      return {
        title: "Meta 액세스 토큰이 만료되었거나 유효하지 않습니다.",
        detail: "설정 페이지에서 Meta 계정을 다시 인증한 뒤 새로고침하세요.",
      }
    }
  }

  if (provider === "naver") {
    if (normalized.includes("api 키") || normalized.includes("api key") || normalized.includes("설정되지")) {
      return {
        title: "Naver API 설정이 완료되지 않았습니다.",
        detail: "설정 페이지에서 API 키와 고객 계정을 입력한 뒤 다시 시도하세요.",
      }
    }
  }

  if (provider === "ga4") {
    if (
      normalized.includes("invalid authentication credentials") ||
      normalized.includes("oauth 2 access token") ||
      normalized.includes("login cookie") ||
      normalized.includes("만료") ||
      normalized.includes("연결되지")
    ) {
      return {
        title: "GA4 Google 인증이 만료되었거나 끊어졌습니다.",
        detail: "Google 계정을 다시 연결한 뒤 GA4 속성 목록을 새로고침하세요.",
      }
    }
  }

  return {
    title:
      provider === "meta"
        ? "Meta 연결 상태를 확인하지 못했습니다."
        : provider === "naver"
          ? "Naver Ads 연결 상태를 확인하지 못했습니다."
          : "GA4 속성 목록을 확인하지 못했습니다.",
    detail: message,
  }
}

export default function BrandChannelManager({
  brand,
  metaMappings,
  naverMappings,
  ga4Mappings,
  ga4Connected,
  isLast,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [metaAccounts, setMetaAccounts] = useState<MetaAccount[]>([])
  const [metaLinked, setMetaLinked] = useState<MetaAdAccount[]>(metaMappings)
  const [metaLoading, setMetaLoading] = useState(false)
  const [metaSelected, setMetaSelected] = useState("")
  const [metaError, setMetaError] = useState<string | null>(null)

  const [naverAccounts, setNaverAccounts] = useState<NaverAccount[]>([])
  const [naverLinked, setNaverLinked] = useState<NaverAdAccount[]>(naverMappings)
  const [naverLoading, setNaverLoading] = useState(false)
  const [naverSelected, setNaverSelected] = useState("")
  const [naverError, setNaverError] = useState<string | null>(null)

  const [ga4Accounts, setGa4Accounts] = useState<Ga4Account[]>([])
  const [ga4Linked, setGa4Linked] = useState<Ga4Property[]>(ga4Mappings)
  const [ga4Loading, setGa4Loading] = useState(false)
  const [ga4Selected, setGa4Selected] = useState("")
  const [ga4Error, setGa4Error] = useState<string | null>(null)
  const [ga4ManualMode, setGa4ManualMode] = useState(false)
  const [ga4PropertyId, setGa4PropertyId] = useState("")
  const [ga4PropertyName, setGa4PropertyName] = useState("")
  const [bootstrapped, setBootstrapped] = useState(false)
  const [modalProvider, setModalProvider] = useState<ModalProvider>(null)
  const [showAddMedia, setShowAddMedia] = useState(false)

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
    if (!open || bootstrapped) return

    fetchMetaAccounts()
    fetchNaverAccounts()
    if (ga4Connected) fetchGa4Properties()
    setBootstrapped(true)
  }, [bootstrapped, ga4Connected, open])

  async function linkMeta() {
    if (!metaSelected) return
    const account = metaAccounts.find((item) => item.id === metaSelected)
    if (!account) return

    setSaving(true)
    try {
      const res = await fetch("/api/admin/meta/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brand.id,
          meta_account_id: account.id,
          meta_account_name: account.name,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setMetaLinked((prev) => [
        ...prev,
        {
          id: "",
          brand_id: brand.id,
          meta_account_id: account.id,
          meta_account_name: account.name,
          created_at: "",
          brand,
        },
      ])
      setMetaSelected("")
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "연결 실패")
    } finally {
      setSaving(false)
    }
  }

  async function unlinkMeta(accountId: string) {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/meta/mapping", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meta_account_id: accountId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setMetaLinked((prev) => prev.filter((item) => item.meta_account_id !== accountId))
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "해제 실패")
    } finally {
      setSaving(false)
    }
  }

  async function linkNaver() {
    if (!naverSelected) return
    const account = naverAccounts.find((item) => item.id === naverSelected)
    if (!account) return

    setSaving(true)
    try {
      const res = await fetch("/api/admin/naver/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brand.id,
          naver_customer_id: account.id,
          naver_account_name: account.name,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setNaverLinked((prev) => [
        ...prev,
        {
          id: "",
          brand_id: brand.id,
          naver_customer_id: account.id,
          naver_account_name: account.name,
          created_at: "",
          brand,
        },
      ])
      setNaverSelected("")
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "연결 실패")
    } finally {
      setSaving(false)
    }
  }

  async function unlinkNaver(customerId: string) {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/naver/mapping", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naver_customer_id: customerId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setNaverLinked((prev) => prev.filter((item) => item.naver_customer_id !== customerId))
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "해제 실패")
    } finally {
      setSaving(false)
    }
  }

  async function linkGa4() {
    if (!ga4Selected) return
    const account = ga4Accounts.find((item) => item.id === ga4Selected)
    if (!account) return

    setSaving(true)
    try {
      const res = await fetch("/api/admin/ga4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brand.id,
          property_id: account.id,
          property_name: account.name,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setGa4Linked((prev) => [
        ...prev.filter((item) => item.property_id !== account.id),
        {
          id: "",
          brand_id: brand.id,
          property_id: account.id,
          property_name: account.name,
          website_url: null,
          created_at: "",
          brand,
        },
      ])
      setGa4Selected("")
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "연결 실패")
    } finally {
      setSaving(false)
    }
  }

  async function addGa4() {
    if (!ga4PropertyId.trim() || !ga4PropertyName.trim()) return

    setSaving(true)
    try {
      const res = await fetch("/api/admin/ga4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brand.id,
          property_id: ga4PropertyId.trim(),
          property_name: ga4PropertyName.trim(),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setGa4Linked((prev) => [
        ...prev.filter((item) => item.property_id !== ga4PropertyId.trim()),
        {
          id: "",
          brand_id: brand.id,
          property_id: ga4PropertyId.trim(),
          property_name: ga4PropertyName.trim(),
          website_url: null,
          created_at: "",
          brand,
        },
      ])
      setGa4PropertyId("")
      setGa4PropertyName("")
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "추가 실패")
    } finally {
      setSaving(false)
    }
  }

  async function removeGa4(propertyId: string) {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/ga4", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: propertyId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setGa4Linked((prev) => prev.filter((item) => item.property_id !== propertyId))
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "삭제 실패")
    } finally {
      setSaving(false)
    }
  }

  function handleCredentialsSaved(provider: "meta" | "naver") {
    if (provider === "meta") {
      setMetaError(null)
      fetchMetaAccounts()
    }

    if (provider === "naver") {
      setNaverError(null)
      fetchNaverAccounts()
    }

    router.refresh()
  }

  const totalLinkedItems = metaLinked.length + naverLinked.length + ga4Linked.length
  const connectedMediaCount =
    Number(metaLinked.length > 0) + Number(naverLinked.length > 0) + Number(ga4Linked.length > 0)
  const issueCount = [
    metaLinked.length === 0 && metaError,
    naverLinked.length === 0 && naverError,
    ga4Linked.length === 0 && ga4Error,
  ].filter(Boolean).length

  const overallTone: MediaTone =
    issueCount > 0
      ? "error"
      : connectedMediaCount === MEDIA_TOTAL
        ? "connected"
        : connectedMediaCount > 0
          ? "partial"
          : "empty"

  const overallSummary =
    issueCount > 0
      ? `확인이 필요한 매체 ${issueCount}개`
      : connectedMediaCount === 0
        ? "아직 연결된 매체가 없습니다"
        : `${connectedMediaCount}/${MEDIA_TOTAL} 매체 연결 완료`

  const availableMeta = metaAccounts.filter(
    (account) => !metaLinked.some((mapping) => mapping.meta_account_id === account.id)
  )
  const availableNaver = naverAccounts.filter(
    (account) => !naverLinked.some((mapping) => mapping.naver_customer_id === account.id)
  )
  const availableGa4 = ga4Accounts.filter(
    (account) => !ga4Linked.some((mapping) => mapping.property_id === account.id)
  )

  const metaTone = getMediaTone(metaLinked.length > 0, metaLinked.length === 0 && Boolean(metaError))
  const naverTone = getMediaTone(naverLinked.length > 0, naverLinked.length === 0 && Boolean(naverError))
  const ga4Tone = getMediaTone(ga4Linked.length > 0, ga4Linked.length === 0 && Boolean(ga4Error))
  const metaErrorDisplay = metaError ? formatProviderError("meta", metaError) : null
  const naverErrorDisplay = naverError ? formatProviderError("naver", naverError) : null
  const ga4ErrorDisplay = ga4Error ? formatProviderError("ga4", ga4Error) : null
  const showMetaCard = metaLinked.length > 0 || Boolean(metaError) || showAddMedia
  const showNaverCard = naverLinked.length > 0 || Boolean(naverError) || showAddMedia
  const showGa4Card = ga4Linked.length > 0 || Boolean(ga4Error) || showAddMedia
  const hasVisibleMediaCards = showMetaCard || showNaverCard || showGa4Card

  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid var(--line)" }}>
      <BrandConnectionModal
        open={modalProvider !== null}
        provider={modalProvider}
        ga4Connected={Boolean(ga4Connected)}
        onClose={() => setModalProvider(null)}
        onSaved={handleCredentialsSaved}
      />

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        style={{
          ...s.trigger,
          background: open ? "var(--bg-2)" : "transparent",
          borderBottom: open ? "1px solid var(--line)" : "none",
        }}
      >
        <div style={s.avatar}>{brand.name.charAt(0).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--text)",
                lineHeight: 1.1,
              }}
            >
              {brand.name}
            </span>
            <span style={s.statusChip(overallTone)}>
              <span style={s.statusDot(toneDotColor(overallTone))} />
              {renderToneLabel(overallTone)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 11, color: "var(--dim)" }}>{overallSummary}</span>
            <span style={{ fontSize: 11, color: "var(--dim)" }}>총 {totalLinkedItems}건 연결</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            marginLeft: "auto",
          }}
        >
          {metaLinked.length > 0 && (
            <span style={s.mediaChip(true, "#6FA8F5")}>Meta {metaLinked.length}</span>
          )}
          {naverLinked.length > 0 && (
            <span style={s.mediaChip(true, "#5ec27a")}>Naver {naverLinked.length}</span>
          )}
          {ga4Linked.length > 0 && (
            <span style={s.mediaChip(true, "#E8B04B")}>GA4 {ga4Linked.length}</span>
          )}
          {totalLinkedItems === 0 && (
            <span style={{ fontSize: 11, color: "var(--dim)" }}>매체 없음</span>
          )}
          <span
            aria-hidden="true"
            style={{
              color: open ? "var(--amber)" : "var(--dim)",
              fontSize: 14,
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform .2s",
            }}
          >
            ▼
          </span>
        </div>
      </button>

      {open && (
        <div
          style={{
            padding: "18px 20px 20px",
            background: "linear-gradient(180deg, var(--bg-1), color-mix(in srgb, var(--bg-1) 84%, var(--bg)))",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>연결 매체</div>
              <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 3 }}>
                연결된 항목과 오류만 먼저 보여줍니다. 새 매체는 필요할 때 추가하세요.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <div style={{ fontSize: 10, color: "var(--dim)" }}>
                연결된 매체 {connectedMediaCount}/{MEDIA_TOTAL}
              </div>
              <button
                type="button"
                onClick={() => setShowAddMedia((prev) => !prev)}
                className="btn"
                style={{ padding: "6px 10px", fontSize: 10 }}
              >
                {showAddMedia ? "미연결 숨기기" : "매체 추가"}
              </button>
              <Link href="/admin/channels" className="btn" style={{ padding: "6px 10px", fontSize: 10 }}>
                연동 허브
              </Link>
            </div>
          </div>

          {!hasVisibleMediaCards && (
            <div style={s.notice("empty")}>
              이 브랜드에 연결된 매체가 없습니다. 필요한 경우 매체 추가를 눌러 계정이나 속성을 연결하세요.
            </div>
          )}

          {hasVisibleMediaCards && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                gap: 12,
              }}
            >
              {showMetaCard && (
                <section style={s.mediaCard}>
              <div style={s.mediaHeader}>
                <div style={s.mediaTitleWrap}>
                  <div style={s.mediaIcon("#1877F220", "#6FA8F5")}>M</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={s.title}>Meta Ads</div>
                    <div style={s.subtitle}>광고 계정 연결 및 상태 관리</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span style={s.statusChip(metaTone)}>
                    <span style={s.statusDot(toneDotColor(metaTone))} />
                    {renderToneLabel(metaTone)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalProvider("meta")}
                    className="btn"
                    style={{ padding: "6px 10px", fontSize: 10 }}
                  >
                    키 설정
                  </button>
                  <button type="button" onClick={fetchMetaAccounts} disabled={metaLoading} style={s.refreshBtn}>
                    {metaLoading ? "불러오는 중" : "새로고침"}
                  </button>
                </div>
              </div>

              {metaErrorDisplay && (metaLinked.length === 0 || showAddMedia) && (
                <div style={s.notice(metaLinked.length > 0 ? "info" : "error")}>
                  <strong style={{ display: "block", color: "#ff9c8f", fontSize: 11 }}>
                    {metaErrorDisplay.title}
                  </strong>
                  <div style={{ marginTop: 3, color: "#ffb1a7" }}>{metaErrorDisplay.detail}</div>
                </div>
              )}

              {metaLinked.length > 0 ? (
                <div style={s.list}>
                  {metaLinked.map((mapping) => (
                    <div key={mapping.meta_account_id} style={s.linkedItem}>
                      <span style={s.mediaIcon("#1877F220", "#6FA8F5")}>M</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={s.linkedName}>{mapping.meta_account_name}</div>
                        <div style={s.linkedMeta}>{mapping.meta_account_id}</div>
                      </div>
                      <span
                        style={{
                          ...s.statusChip("connected"),
                          padding: "3px 8px",
                          fontSize: 9,
                        }}
                      >
                        연결
                      </span>
                      <button
                        type="button"
                        onClick={() => unlinkMeta(mapping.meta_account_id)}
                        disabled={saving}
                        style={{ ...s.unlinkBtn, opacity: saving ? 0.5 : 1 }}
                      >
                        해제
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={s.notice("empty")}>아직 연결된 Meta 광고 계정이 없습니다.</div>
              )}

              {metaLoading ? (
                <div style={s.notice("info")}>Meta 광고 계정을 불러오는 중입니다.</div>
              ) : availableMeta.length > 0 ? (
                <div style={s.formRow}>
                  <select value={metaSelected} onChange={(e) => setMetaSelected(e.target.value)} style={s.select}>
                    <option value="">연결할 계정 선택</option>
                    {availableMeta.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({STATUS_LABELS[account.account_status] ?? account.account_status})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={linkMeta}
                    disabled={saving || !metaSelected}
                    className="btn primary"
                    style={{ opacity: saving || !metaSelected ? 0.4 : 1 }}
                  >
                    연결
                  </button>
                </div>
              ) : !metaError ? (
                <div style={s.notice("empty")}>
                  연결 가능한 Meta 계정이 없습니다. API 설정을 확인한 뒤 새로고침하세요.
                </div>
              ) : null}
                </section>
              )}

              {showNaverCard && (
                <section style={s.mediaCard}>
              <div style={s.mediaHeader}>
                <div style={s.mediaTitleWrap}>
                  <div style={s.mediaIcon("#03c75a20", "#5ec27a")}>N</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={s.title}>Naver Ads</div>
                    <div style={s.subtitle}>검색 광고 계정 연결 관리</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span style={s.statusChip(naverTone)}>
                    <span style={s.statusDot(toneDotColor(naverTone))} />
                    {renderToneLabel(naverTone)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalProvider("naver")}
                    className="btn"
                    style={{ padding: "6px 10px", fontSize: 10 }}
                  >
                    키 설정
                  </button>
                  <button type="button" onClick={fetchNaverAccounts} disabled={naverLoading} style={s.refreshBtn}>
                    {naverLoading ? "불러오는 중" : "새로고침"}
                  </button>
                </div>
              </div>

              {naverErrorDisplay && (
                <div style={s.notice("error")}>
                  <strong style={{ display: "block", color: "#ff9c8f", fontSize: 11 }}>
                    {naverErrorDisplay.title}
                  </strong>
                  <div style={{ marginTop: 3, color: "#ffb1a7" }}>{naverErrorDisplay.detail}</div>
                </div>
              )}

              {naverLinked.length > 0 ? (
                <div style={s.list}>
                  {naverLinked.map((mapping) => (
                    <div key={mapping.naver_customer_id} style={s.linkedItem}>
                      <span style={s.mediaIcon("#03c75a20", "#5ec27a")}>N</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={s.linkedName}>{mapping.naver_account_name}</div>
                        <div style={s.linkedMeta}>{mapping.naver_customer_id}</div>
                      </div>
                      <span
                        style={{
                          ...s.statusChip("connected"),
                          padding: "3px 8px",
                          fontSize: 9,
                        }}
                      >
                        연결
                      </span>
                      <button
                        type="button"
                        onClick={() => unlinkNaver(mapping.naver_customer_id)}
                        disabled={saving}
                        style={{ ...s.unlinkBtn, opacity: saving ? 0.5 : 1 }}
                      >
                        해제
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={s.notice("empty")}>아직 연결된 Naver 광고 계정이 없습니다.</div>
              )}

              {naverLoading ? (
                <div style={s.notice("info")}>Naver Ads 계정을 불러오는 중입니다.</div>
              ) : availableNaver.length > 0 ? (
                <div style={s.formRow}>
                  <select value={naverSelected} onChange={(e) => setNaverSelected(e.target.value)} style={s.select}>
                    <option value="">연결할 계정 선택</option>
                    {availableNaver.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={linkNaver}
                    disabled={saving || !naverSelected}
                    className="btn primary"
                    style={{ opacity: saving || !naverSelected ? 0.4 : 1 }}
                  >
                    연결
                  </button>
                </div>
              ) : !naverError ? (
                <div style={s.notice("empty")}>
                  연결 가능한 Naver 계정이 없습니다. API 키를 확인한 뒤 새로고침하세요.
                </div>
              ) : null}
                </section>
              )}

              {showGa4Card && (
                <section style={s.mediaCard}>
              <div style={s.mediaHeader}>
                <div style={s.mediaTitleWrap}>
                  <div style={s.mediaIcon("#FBBC0520", "#E8B04B")}>G</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={s.title}>GA4</div>
                    <div style={s.subtitle}>속성 연결과 수동 등록 관리</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {ga4Connected && (
                    <span style={s.statusChip("connected")}>
                      <span style={s.statusDot("var(--good)")} />
                      공통 인증
                    </span>
                  )}
                  <span style={s.statusChip(ga4Tone)}>
                    <span style={s.statusDot(toneDotColor(ga4Tone))} />
                    {renderToneLabel(ga4Tone)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalProvider("ga4")}
                    className="btn"
                    style={{ padding: "6px 10px", fontSize: 10 }}
                  >
                    {ga4Connected ? "재연결" : "연결"}
                  </button>
                  {ga4Connected && (
                    <button type="button" onClick={fetchGa4Properties} disabled={ga4Loading} style={s.refreshBtn}>
                      {ga4Loading ? "불러오는 중" : "새로고침"}
                    </button>
                  )}
                </div>
              </div>

              {ga4ErrorDisplay && (
                <div style={s.notice("error")}>
                  <strong style={{ display: "block", color: "#ff9c8f", fontSize: 11 }}>
                    {ga4ErrorDisplay.title}
                  </strong>
                  <div style={{ marginTop: 3, color: "#ffb1a7" }}>{ga4ErrorDisplay.detail}</div>
                </div>
              )}

              {ga4Linked.length > 0 ? (
                <div style={s.list}>
                  {ga4Linked.map((mapping) => (
                    <div key={mapping.property_id} style={s.linkedItem}>
                      <span style={s.mediaIcon("#FBBC0520", "#E8B04B")}>G</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={s.linkedName}>{mapping.property_name}</div>
                        <div style={s.linkedMeta}>{mapping.property_id}</div>
                      </div>
                      <span
                        style={{
                          ...s.statusChip("connected"),
                          padding: "3px 8px",
                          fontSize: 9,
                        }}
                      >
                        연결
                      </span>
                      <button
                        type="button"
                        onClick={() => removeGa4(mapping.property_id)}
                        disabled={saving}
                        style={{ ...s.unlinkBtn, opacity: saving ? 0.5 : 1 }}
                      >
                        해제
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={s.notice("empty")}>아직 연결된 GA4 속성이 없습니다.</div>
              )}

              {!ga4Connected && ga4Linked.length === 0 && (
                <div style={s.notice("info")}>
                  상단의 Google 계정 연결을 먼저 완료하면 GA4 속성 목록을 불러올 수 있습니다.
                </div>
              )}

              {ga4Connected && ga4Loading ? (
                <div style={s.notice("info")}>GA4 속성 목록을 불러오는 중입니다.</div>
              ) : null}

              {ga4Connected && !ga4Loading && !ga4ManualMode && availableGa4.length > 0 && (
                <div style={s.formRow}>
                  <select value={ga4Selected} onChange={(e) => setGa4Selected(e.target.value)} style={s.select}>
                    <option value="">연결할 GA4 속성 선택</option>
                    {availableGa4.map((account) => (
                      <option key={account.id} value={account.id}>
                        [{account.accountName}] {account.name} ({account.id})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={linkGa4}
                    disabled={saving || !ga4Selected}
                    className="btn primary"
                    style={{ opacity: saving || !ga4Selected ? 0.4 : 1 }}
                  >
                    연결
                  </button>
                </div>
              )}

              {ga4ManualMode ? (
                <>
                  <div style={s.formRow}>
                    <input
                      type="text"
                      value={ga4PropertyId}
                      onChange={(e) => setGa4PropertyId(e.target.value)}
                      placeholder="속성 ID"
                      style={{ ...s.input, width: 140 }}
                    />
                    <input
                      type="text"
                      value={ga4PropertyName}
                      onChange={(e) => setGa4PropertyName(e.target.value)}
                      placeholder="속성 이름"
                      style={{ ...s.input, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={addGa4}
                      disabled={saving || !ga4PropertyId.trim() || !ga4PropertyName.trim()}
                      className="btn primary"
                      style={{
                        opacity:
                          saving || !ga4PropertyId.trim() || !ga4PropertyName.trim() ? 0.4 : 1,
                      }}
                    >
                      추가
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGa4ManualMode(false)}
                    style={s.secondaryAction}
                  >
                    ← 목록 선택으로 돌아가기
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setGa4ManualMode(true)}
                  style={s.secondaryAction}
                >
                  직접 속성 ID 입력하기 →
                </button>
              )}
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
