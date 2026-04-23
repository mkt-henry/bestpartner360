"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { Brand } from "@/types"
import { PROVIDER_METADATA } from "@/lib/providers/public"
import type { ProviderId, ProviderMetadata } from "@/lib/providers/types"
import BrandConnectionModal from "@/components/admin/BrandConnectionModal"

export interface BrandProviderMapping {
  providerId: ProviderId
  account_id: string
  account_name: string
}

export interface ProviderInitialState {
  accounts: RemoteAccount[]
  error: string | null
  bootstrapped: boolean
}

interface Props {
  brand: Brand
  mappings: Record<ProviderId, BrandProviderMapping[]>
  ga4Connected: boolean
  providerInitial?: Record<ProviderId, ProviderInitialState>
  isLast?: boolean
}

interface RemoteAccount {
  id: string
  name: string
  status?: string | null
}

interface ProviderState {
  accounts: RemoteAccount[]
  linked: BrandProviderMapping[]
  loading: boolean
  selected: string
  error: string | null
  // Manual-add (GA4 only)
  manualMode: boolean
  manualId: string
  manualName: string
}

type ProviderStateMap = Record<ProviderId, ProviderState>
type ModalProvider = ProviderId | null
type MediaTone = "connected" | "partial" | "empty" | "error"

function initialState(
  linked: BrandProviderMapping[],
  preloaded?: ProviderInitialState
): ProviderState {
  return {
    accounts: preloaded?.accounts ?? [],
    linked,
    loading: false,
    selected: "",
    error: preloaded?.error ?? null,
    manualMode: false,
    manualId: "",
    manualName: "",
  }
}

function mediaTone(linked: number, errored: boolean): MediaTone {
  // linked 매핑이 있고 에러가 있으면 "인증 만료/오류"로 간주 (error 톤)
  // 매핑도 없고 에러만 있는 경우는 단순 미설정 → empty로 처리
  if (errored && linked > 0) return "error"
  if (linked > 0) return "connected"
  return "empty"
}

function toneLabel(tone: MediaTone) {
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

function humanizeError(provider: ProviderMetadata, message: string) {
  const lower = message.toLowerCase()
  const authHints = [
    "session has expired",
    "access token",
    "invalid authentication credentials",
    "oauth 2 access token",
    "login cookie",
    "만료",
    "설정되지",
    "연결되지",
    "api 키",
    "api key",
  ]
  if (authHints.some((h) => lower.includes(h))) {
    return {
      title: `${provider.shortLabel} 인증이 만료되었거나 설정되지 않았습니다.`,
      detail:
        provider.authMode === "oauth"
          ? "매체 연결 화면에서 Google 계정을 다시 연결한 뒤 새로고침하세요."
          : "매체 연결 화면에서 API 키를 다시 확인한 뒤 새로고침하세요.",
    }
  }
  return {
    title: `${provider.shortLabel} 연결 상태를 확인하지 못했습니다.`,
    detail: message,
  }
}

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
    background: "var(--bg-2)",
    border: "1px solid var(--line)",
    borderRadius: 14,
    padding: 16,
    display: "flex",
    flexDirection: "column" as const,
    gap: 14,
    minWidth: 0,
  },
  mediaHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  mediaTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  mediaIcon: (background: string, color: string) => ({
    width: 28,
    height: 28,
    borderRadius: 8,
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
    fontWeight: 600,
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
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid var(--line)",
    background: "var(--bg-1)",
    color: "var(--text-2)",
    fontSize: 10,
    fontWeight: 500,
  },
  list: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  linkedItem: {
    display: "grid",
    gridTemplateColumns: "24px minmax(0, 1fr) auto auto",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    background: "var(--bg-1)",
    border: "1px solid var(--line)",
    borderRadius: 10,
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
    padding: "5px 8px",
    borderRadius: 8,
    border: "1px solid #e5553b30",
    color: "var(--bad)",
    fontSize: 10,
    fontWeight: 600,
    flexShrink: 0,
  },
  notice: (tone: "error" | "empty" | "info") => ({
    padding: "12px 13px",
    borderRadius: 10,
    border:
      tone === "error"
        ? "1px solid #e5553b2d"
        : tone === "info"
          ? "1px solid #7db8d62d"
          : "1px solid var(--line)",
    background:
      tone === "error"
        ? "#2a1313"
        : tone === "info"
          ? "#101822"
          : "var(--bg-1)",
    color: tone === "error" ? "#ff9c8f" : tone === "info" ? "#9fc8dd" : "var(--dim)",
    fontSize: 11,
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
    padding: "10px 12px",
    background: "var(--bg-1)",
    border: "1px solid var(--line)",
    borderRadius: 10,
    color: "var(--text)",
    font: "inherit",
    fontSize: 11,
    outline: "none",
  },
  input: {
    minWidth: 140,
    padding: "10px 12px",
    background: "var(--bg-1)",
    border: "1px solid var(--line)",
    borderRadius: 10,
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
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
  },
}

export default function BrandChannelManager({
  brand,
  mappings,
  ga4Connected,
  providerInitial,
  isLast,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  // Mark providers with a server-preloaded account list/error as already
  // bootstrapped so the client-side fetch doesn't re-run on panel open.
  const [bootstrapped, setBootstrapped] = useState(() =>
    Boolean(providerInitial && PROVIDER_METADATA.some((p) => providerInitial[p.id]?.bootstrapped))
  )
  const [modalProvider, setModalProvider] = useState<ModalProvider>(null)

  const [state, setState] = useState<ProviderStateMap>(() => {
    const init = {} as ProviderStateMap
    for (const p of PROVIDER_METADATA) {
      init[p.id] = initialState(mappings[p.id] ?? [], providerInitial?.[p.id])
    }
    return init
  })

  const patchProvider = useCallback(
    (id: ProviderId, patch: Partial<ProviderState>) => {
      setState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
    },
    []
  )

  const fetchAccounts = useCallback(
    async (id: ProviderId) => {
      patchProvider(id, { loading: true, error: null })
      try {
        const res = await fetch(`/api/admin/providers/${id}/accounts`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "계정 로드 실패")
        patchProvider(id, { accounts: json.accounts ?? [], loading: false })
      } catch (e: unknown) {
        patchProvider(id, {
          loading: false,
          error: e instanceof Error ? e.message : "계정 로드 실패",
        })
      }
    },
    [patchProvider]
  )

  // Bootstrap account lists on first open.
  useEffect(() => {
    if (!open || bootstrapped) return
    for (const p of PROVIDER_METADATA) {
      // Don't hit GA4 listAccounts unless OAuth is wired up.
      if (p.authMode === "oauth" && !ga4Connected) continue
      fetchAccounts(p.id)
    }
    setBootstrapped(true)
  }, [open, bootstrapped, ga4Connected, fetchAccounts])

  async function linkAccount(id: ProviderId, account: { id: string; name: string }) {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/providers/${id}/mapping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brand.id,
          account_id: account.id,
          account_name: account.name,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? "연결 실패")
      setState((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          linked: [
            ...prev[id].linked.filter((m) => m.account_id !== account.id),
            { providerId: id, account_id: account.id, account_name: account.name },
          ],
          selected: "",
          manualId: "",
          manualName: "",
        },
      }))
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "연결 실패")
    } finally {
      setSaving(false)
    }
  }

  async function unlinkAccount(id: ProviderId, accountId: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/providers/${id}/mapping`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId, brand_id: brand.id }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? "해제 실패")
      setState((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          linked: prev[id].linked.filter((m) => m.account_id !== accountId),
        },
      }))
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "해제 실패")
    } finally {
      setSaving(false)
    }
  }

  function handleCredentialsSaved(provider: ProviderId) {
    // OAuth-flow providers (ga4) re-authenticate via redirect; nothing to refetch here.
    if (PROVIDER_METADATA.find((p) => p.id === provider)?.authMode === "manual") {
      fetchAccounts(provider)
    }
    router.refresh()
  }

  const totalLinked = Object.values(state).reduce((sum, st) => sum + st.linked.length, 0)
  const connectedCount = Object.values(state).filter((st) => st.linked.length > 0).length
  const mediaTotal = PROVIDER_METADATA.length
  // linked 매핑이 있는 매체에 한해 에러가 있으면 문제로 집계
  // (매핑도 없는 매체의 에러는 단순 미설정일 가능성이 높음)
  const issueCount = Object.values(state).filter((st) => st.error && st.linked.length > 0).length

  const overallTone: MediaTone =
    issueCount > 0
      ? "error"
      : connectedCount === mediaTotal
        ? "connected"
        : connectedCount > 0
          ? "partial"
          : "empty"

  const overallSummary =
    issueCount > 0
      ? `확인이 필요한 매체 ${issueCount}개`
      : connectedCount === 0
        ? "아직 연결된 매체가 없습니다"
        : `${connectedCount}/${mediaTotal} 매체 연결 완료`

  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid var(--line)" }}>
      <BrandConnectionModal
        open={modalProvider !== null}
        provider={modalProvider}
        ga4Connected={ga4Connected}
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", lineHeight: 1.1 }}>
              {brand.name}
            </span>
            <span style={s.statusChip(overallTone)}>
              <span style={s.statusDot(toneDotColor(overallTone))} />
              {toneLabel(overallTone)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--dim)" }}>{overallSummary}</span>
            <span style={{ fontSize: 11, color: "var(--dim)" }}>총 {totalLinked}건 연결</span>
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
          {PROVIDER_METADATA.map((p) => (
            <span key={p.id} style={s.mediaChip(state[p.id].linked.length > 0, p.ui.iconColor)}>
              {p.shortLabel} {state[p.id].linked.length || "0"}
            </span>
          ))}
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
            background:
              "linear-gradient(180deg, var(--bg-1), color-mix(in srgb, var(--bg-1) 84%, var(--bg)))",
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
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>매체 연결 관리</div>
              <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 3 }}>
                브랜드별 광고 계정과 GA4 속성을 이곳에서 바로 연결하거나 해제할 수 있습니다.
              </div>
            </div>
            <div style={{ fontSize: 10, color: "var(--dim)" }}>
              연결된 매체 {connectedCount}/{mediaTotal}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {PROVIDER_METADATA.map((provider) => {
              const st = state[provider.id]
              const isOauthLocked = provider.authMode === "oauth" && !ga4Connected
              const tone = mediaTone(st.linked.length, Boolean(st.error))
              const errorDisplay = st.error ? humanizeError(provider, st.error) : null
              const availableAccounts = st.accounts.filter(
                (a) => !st.linked.some((m) => m.account_id === a.id)
              )

              return (
                <section key={provider.id} style={s.mediaCard}>
                  <div style={s.mediaHeader}>
                    <div style={s.mediaTitleWrap}>
                      <div style={s.mediaIcon(provider.ui.iconBg, provider.ui.iconColor)}>
                        {provider.ui.iconMark}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={s.title}>{provider.label}</div>
                        <div style={s.subtitle}>{provider.ui.cardSubtitle}</div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      {provider.authMode === "oauth" && ga4Connected && (
                        <span style={s.statusChip("connected")}>
                          <span style={s.statusDot("var(--good)")} />
                          공통 인증
                        </span>
                      )}
                      <span style={s.statusChip(tone)}>
                        <span style={s.statusDot(toneDotColor(tone))} />
                        {toneLabel(tone)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setModalProvider(provider.id)}
                        className="btn"
                        style={{ padding: "6px 10px", fontSize: 10 }}
                      >
                        {provider.authMode === "oauth"
                          ? ga4Connected
                            ? "재연결"
                            : "연결"
                          : "키 설정"}
                      </button>
                      {!isOauthLocked && (
                        <button
                          type="button"
                          onClick={() => fetchAccounts(provider.id)}
                          disabled={st.loading}
                          style={s.refreshBtn}
                        >
                          {st.loading ? "불러오는 중" : "새로고침"}
                        </button>
                      )}
                    </div>
                  </div>

                  {errorDisplay && (
                    <div style={s.notice("error")}>
                      {errorDisplay.title}
                      <div style={{ marginTop: 4, color: "#ffb1a7" }}>{errorDisplay.detail}</div>
                    </div>
                  )}

                  {st.linked.length > 0 ? (
                    <div style={s.list}>
                      {st.linked.map((m) => (
                        <div key={m.account_id} style={s.linkedItem}>
                          <span style={s.mediaIcon(provider.ui.iconBg, provider.ui.iconColor)}>
                            {provider.ui.iconMark}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={s.linkedName}>{m.account_name}</div>
                            <div style={s.linkedMeta}>{m.account_id}</div>
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
                            onClick={() => unlinkAccount(provider.id, m.account_id)}
                            disabled={saving}
                            style={{ ...s.unlinkBtn, opacity: saving ? 0.5 : 1 }}
                          >
                            해제
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={s.notice("empty")}>
                      아직 연결된 {provider.shortLabel} {provider.category === "ads" ? "광고 계정" : "속성"}이 없습니다.
                    </div>
                  )}

                  {isOauthLocked ? (
                    <div style={s.notice("info")}>
                      상단의 Google 계정 연결을 먼저 완료하면 GA4 속성 목록을 불러올 수 있습니다.
                    </div>
                  ) : st.loading ? (
                    <div style={s.notice("info")}>
                      {provider.shortLabel} 계정을 불러오는 중입니다.
                    </div>
                  ) : st.manualMode ? null : availableAccounts.length > 0 ? (
                    <div style={s.formRow}>
                      <select
                        value={st.selected}
                        onChange={(e) => patchProvider(provider.id, { selected: e.target.value })}
                        style={s.select}
                      >
                        <option value="">연결할 계정 선택</option>
                        {availableAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                            {account.status ? ` · ${account.status}` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const acc = availableAccounts.find((a) => a.id === st.selected)
                          if (acc) linkAccount(provider.id, acc)
                        }}
                        disabled={saving || !st.selected}
                        className="btn primary"
                        style={{ opacity: saving || !st.selected ? 0.4 : 1 }}
                      >
                        연결
                      </button>
                    </div>
                  ) : !st.error ? (
                    <div style={s.notice("empty")}>
                      연결 가능한 계정이 없습니다. API 설정을 확인한 뒤 새로고침하세요.
                    </div>
                  ) : null}

                  {provider.supportsManualAdd && !isOauthLocked && (
                    <>
                      {st.manualMode ? (
                        <>
                          <div style={s.formRow}>
                            <input
                              type="text"
                              value={st.manualId}
                              onChange={(e) => patchProvider(provider.id, { manualId: e.target.value })}
                              placeholder={
                                provider.id === "ga4" ? "속성 ID" : `${provider.shortLabel} 계정 ID`
                              }
                              style={{ ...s.input, width: 140 }}
                            />
                            <input
                              type="text"
                              value={st.manualName}
                              onChange={(e) => patchProvider(provider.id, { manualName: e.target.value })}
                              placeholder={provider.id === "ga4" ? "속성 이름" : "계정 이름"}
                              style={{ ...s.input, flex: 1 }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const idv = st.manualId.trim()
                                const nv = st.manualName.trim()
                                if (!idv || !nv) return
                                linkAccount(provider.id, { id: idv, name: nv })
                              }}
                              disabled={
                                saving || !st.manualId.trim() || !st.manualName.trim()
                              }
                              className="btn primary"
                              style={{
                                opacity:
                                  saving || !st.manualId.trim() || !st.manualName.trim() ? 0.4 : 1,
                              }}
                            >
                              추가
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => patchProvider(provider.id, { manualMode: false })}
                            style={s.secondaryAction}
                          >
                            ← 목록 선택으로 돌아가기
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => patchProvider(provider.id, { manualMode: true })}
                          style={s.secondaryAction}
                        >
                          직접 ID 입력하기 →
                        </button>
                      )}
                    </>
                  )}
                </section>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
