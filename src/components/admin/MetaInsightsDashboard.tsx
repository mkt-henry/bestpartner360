"use client"

import { useState, useCallback } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatNumber } from "@/lib/utils"
import { RefreshCw, ImageIcon, Layers, Target, Megaphone } from "lucide-react"

/* --- Types --- */
interface MetaAccount {
  id: string
  brand_id: string
  meta_account_id: string
  meta_account_name: string
  brand?: { id: string; name: string }
}

interface MetaAction { action_type: string; value: string }

interface InsightRow {
  campaign_id?: string; campaign_name?: string
  adset_id?: string; adset_name?: string
  ad_id?: string; ad_name?: string
  impressions: string; reach?: string; clicks: string; spend: string
  cpc?: string; cpm?: string; ctr?: string; frequency?: string
  actions?: MetaAction[]; date_start?: string; date_stop?: string
}

interface ParsedRow {
  id: string; name: string
  impressions: number; reach: number; clicks: number; spend: number
  ctr: number; cpc: number; frequency: number
  actions?: MetaAction[]
}

interface Props { accounts: MetaAccount[] }

/* --- Constants --- */
const ACTION_LABELS: Record<string, string> = {
  link_click: "링크 클릭", post_engagement: "참여", page_engagement: "페이지 참여",
  like: "좋아요", comment: "댓글", landing_page_view: "랜딩페이지",
  video_view: "영상 조회", purchase: "구매", omni_purchase: "구매",
  lead: "리드", add_to_cart: "장바구니", initiate_checkout: "결제 시작",
  "offsite_conversion.fb_pixel_purchase": "구매",
  "offsite_conversion.fb_pixel_lead": "리드",
}

const DATE_PRESETS = [
  { key: "today", label: "오늘" }, { key: "yesterday", label: "어제" },
  { key: "7d", label: "7일" }, { key: "14d", label: "14일" },
  { key: "30d", label: "30일" }, { key: "this_month", label: "이번달" },
  { key: "last_month", label: "지난달" },
]

function getDateRange(preset: string) {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  switch (preset) {
    case "today": return { since: fmt(now), until: fmt(now) }
    case "yesterday": { const y = new Date(now); y.setDate(y.getDate() - 1); return { since: fmt(y), until: fmt(y) } }
    case "7d": { const d = new Date(now); d.setDate(d.getDate() - 6); return { since: fmt(d), until: fmt(now) } }
    case "14d": { const d = new Date(now); d.setDate(d.getDate() - 13); return { since: fmt(d), until: fmt(now) } }
    case "30d": { const d = new Date(now); d.setDate(d.getDate() - 29); return { since: fmt(d), until: fmt(now) } }
    case "this_month": { const s = new Date(now.getFullYear(), now.getMonth(), 1); return { since: fmt(s), until: fmt(now) } }
    case "last_month": { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { since: fmt(s), until: fmt(e) } }
    default: return { since: fmt(now), until: fmt(now) }
  }
}

function parseRows(data: InsightRow[], level: "campaign" | "adset" | "ad"): ParsedRow[] {
  return data.map((r) => ({
    id: (level === "campaign" ? r.campaign_id : level === "adset" ? r.adset_id : r.ad_id) ?? "",
    name: (level === "campaign" ? r.campaign_name : level === "adset" ? r.adset_name : r.ad_name) ?? "Unknown",
    impressions: Number(r.impressions ?? 0), reach: Number(r.reach ?? 0),
    clicks: Number(r.clicks ?? 0), spend: Number(r.spend ?? 0),
    ctr: Number(r.ctr ?? 0), cpc: Number(r.cpc ?? 0),
    frequency: Number(r.frequency ?? 0), actions: r.actions,
  })).sort((a, b) => b.spend - a.spend)
}

function sumRows(rows: ParsedRow[]) {
  return rows.reduce((a, r) => ({
    spend: a.spend + r.spend, impressions: a.impressions + r.impressions,
    clicks: a.clicks + r.clicks, reach: a.reach + r.reach,
  }), { spend: 0, impressions: 0, clicks: 0, reach: 0 })
}

function getTopAction(actions?: MetaAction[]): { label: string; value: number } | null {
  if (!actions?.length) return null
  const preferred = ["link_click", "landing_page_view", "purchase", "omni_purchase", "lead"]
  const found = preferred.map((t) => actions.find((a) => a.action_type === t)).find(Boolean) ?? actions[0]
  return { label: ACTION_LABELS[found.action_type] ?? found.action_type, value: Number(found.value) }
}

/* --- Main --- */
export default function MetaInsightsDashboard({ accounts }: Props) {
  const [selectedAccount, setSelectedAccount] = useState("")
  const [datePreset, setDatePreset] = useState("7d")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [campaigns, setCampaigns] = useState<ParsedRow[]>([])
  const [adsets, setAdsets] = useState<ParsedRow[]>([])
  const [ads, setAds] = useState<ParsedRow[]>([])
  const [daily, setDaily] = useState<InsightRow[]>([])

  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [selectedAdset, setSelectedAdset] = useState<string | null>(null)

  const [adPreviews, setAdPreviews] = useState<Record<string, { thumbnail_url: string | null; image_url: string | null }>>({})
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null)

  const [rawAdsets, setRawAdsets] = useState<InsightRow[]>([])
  const [rawAds, setRawAds] = useState<InsightRow[]>([])

  async function safeJson(res: Response): Promise<{ summary?: InsightRow[]; daily?: InsightRow[]; error?: string } | null> {
    const contentType = res.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) return null
    try { return await res.json() } catch { return null }
  }

  const fetchAllData = useCallback(async () => {
    if (!selectedAccount) return
    setLoading(true)
    setError(null)
    setSelectedCampaign(null)
    setSelectedAdset(null)
    setAdPreviews({})

    const { since, until } = getDateRange(datePreset)
    const qs = (level: string) =>
      `/api/admin/meta/insights?account_id=${encodeURIComponent(selectedAccount)}&since=${since}&until=${until}&level=${level}`

    try {
      const [campRes, adsetRes, adRes, dailyRes] = await Promise.all([
        fetch(qs("campaign")),
        fetch(qs("adset")),
        fetch(qs("ad")),
        fetch(qs("account")),
      ])

      const campJson = await safeJson(campRes)
      if (!campJson || !campRes.ok) {
        throw new Error(campJson?.error ?? `API 오류 (${campRes.status})`)
      }

      const [adsetJson, adJson, dailyJson] = await Promise.all([
        safeJson(adsetRes),
        safeJson(adRes),
        safeJson(dailyRes),
      ])

      const rawAdsetData = adsetJson?.summary ?? []
      const rawAdData = adJson?.summary ?? []

      setCampaigns(parseRows(campJson.summary ?? [], "campaign"))
      setAdsets(parseRows(rawAdsetData, "adset"))
      setAds(parseRows(rawAdData, "ad"))
      setRawAdsets(rawAdsetData)
      setRawAds(rawAdData)
      setDaily(dailyJson?.daily ?? [])

      const adIds = rawAdData.map((r: InsightRow) => r.ad_id).filter(Boolean).slice(0, 50)
      if (adIds.length > 0) {
        fetch(`/api/admin/meta/ad-previews?ad_ids=${adIds.join(",")}`)
          .then(async (r) => {
            const json = await safeJson(r)
            if (!json) return
            const data = (json as unknown as { previews: { ad_id: string; thumbnail_url: string | null; image_url: string | null }[] }).previews ?? []
            const map: Record<string, { thumbnail_url: string | null; image_url: string | null }> = {}
            for (const p of data) map[p.ad_id] = { thumbnail_url: p.thumbnail_url, image_url: p.image_url }
            setAdPreviews(map)
          })
          .catch(() => {})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류")
      setCampaigns([]); setAdsets([]); setAds([]); setRawAdsets([]); setRawAds([]); setDaily([])
    } finally {
      setLoading(false)
    }
  }, [selectedAccount, datePreset])

  const filteredAdsets = selectedCampaign
    ? parseRows(rawAdsets.filter((r) => r.campaign_id === selectedCampaign), "adset")
    : adsets

  const filteredAds = selectedAdset
    ? parseRows(rawAds.filter((r) => r.adset_id === selectedAdset), "ad")
    : selectedCampaign
    ? parseRows(rawAds.filter((r) => r.campaign_id === selectedCampaign), "ad")
    : ads

  const accountTotals = sumRows(campaigns)
  const accountCtr = accountTotals.impressions > 0 ? (accountTotals.clicks / accountTotals.impressions) * 100 : 0
  const accountCpc = accountTotals.clicks > 0 ? accountTotals.spend / accountTotals.clicks : 0

  const dailyChart = daily.map((d) => ({
    date: d.date_start?.slice(5) ?? "",
    spend: Number(d.spend ?? 0),
  }))

  const allActions: Record<string, number> = {}
  for (const row of campaigns) {
    for (const a of row.actions ?? []) {
      allActions[a.action_type] = (allActions[a.action_type] ?? 0) + Number(a.value)
    }
  }
  const topActions = Object.entries(allActions).sort(([, a], [, b]) => b - a).slice(0, 6)

  const hasData = campaigns.length > 0

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Controls */}
      <div className="panel">
        <div className="p-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <select
              value={selectedAccount}
              onChange={(e) => { setSelectedAccount(e.target.value); setCampaigns([]); setAdsets([]); setAds([]) }}
              className="form-select"
              style={{ flex: 1 }}
            >
              <option value="">광고 계정 선택</option>
              {accounts.map((acc) => (
                <option key={acc.meta_account_id} value={acc.meta_account_id}>
                  {acc.brand?.name ? `[${acc.brand.name}] ` : ""}{acc.meta_account_name}
                </option>
              ))}
            </select>
            <button
              onClick={fetchAllData}
              disabled={!selectedAccount || loading}
              className="btn primary"
              style={{ opacity: (!selectedAccount || loading) ? 0.5 : 1 }}
            >
              <RefreshCw style={{ width: 14, height: 14, animation: loading ? "spin 1s linear infinite" : "none" }} />
              전체 조회
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, overflowX: "auto" }}>
            {DATE_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setDatePreset(p.key)}
                className={datePreset === p.key ? "chip on" : "chip"}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: "#e5553b1a", border: "1px solid #e5553b30", borderRadius: 8, padding: 14 }}>
          <p style={{ fontSize: 12, color: "var(--bad)" }}>{error}</p>
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
          <RefreshCw style={{ width: 20, height: 20, color: "var(--amber)", animation: "spin 1s linear infinite" }} />
          <span style={{ marginLeft: 8, fontSize: 12, color: "var(--dim)" }}>캠페인 · 세트 · 소재 데이터를 불러오는 중...</span>
        </div>
      )}

      {!loading && hasData && (
        <>
          {/* KPI Summary */}
          <div className="kpi-row">
            <MiniKpi label="지출" value={`₩${Math.round(accountTotals.spend).toLocaleString()}`} />
            <MiniKpi label="노출" value={formatNumber(accountTotals.impressions)} />
            <MiniKpi label="도달" value={formatNumber(accountTotals.reach)} />
            <MiniKpi label="클릭" value={formatNumber(accountTotals.clicks)} />
            <MiniKpi label="CTR" value={`${accountCtr.toFixed(2)}%`} />
            <MiniKpi label="CPC" value={`₩${Math.round(accountCpc).toLocaleString()}`} />
          </div>

          {/* Daily Spend Mini Chart + Actions */}
          <div style={{ display: "grid", gridTemplateColumns: dailyChart.length > 1 && topActions.length > 0 ? "2fr 1fr" : "1fr", gap: 14 }}>
            {dailyChart.length > 1 && (
              <div className="panel">
                <div className="p-head"><h3>일별 지출</h3></div>
                <div className="p-body">
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={dailyChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--dim)" }} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--dim)" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v) => [`₩${Math.round(Number(v)).toLocaleString()}`, "지출"]} contentStyle={{ background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 11 }} />
                      <Bar dataKey="spend" fill="var(--amber)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {topActions.length > 0 && (
              <div className="panel">
                <div className="p-head"><h3>주요 액션</h3></div>
                <div className="p-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {topActions.map(([type, count]) => (
                    <div key={type} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ACTION_LABELS[type] ?? type}</span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{formatNumber(count)}</span>
                        {accountTotals.spend > 0 && (
                          <span style={{ fontSize: 10, color: "var(--dim)", marginLeft: 6 }}>
                            CPA ₩{Math.round(accountTotals.spend / count).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3-Column Panel */}
          <div className="three" style={{ minHeight: 400 }}>
            <PanelList
              icon={<Megaphone style={{ width: 13, height: 13 }} />}
              title="캠페인"
              count={campaigns.length}
              rows={campaigns}
              selectedId={selectedCampaign}
              onSelect={(id) => { setSelectedCampaign(id === selectedCampaign ? null : id); setSelectedAdset(null) }}
              totalSpend={accountTotals.spend}
            />
            <PanelList
              icon={<Layers style={{ width: 13, height: 13 }} />}
              title={selectedCampaign ? `광고세트` : "전체 광고세트"}
              subtitle={selectedCampaign ? campaigns.find((c) => c.id === selectedCampaign)?.name : undefined}
              count={filteredAdsets.length}
              rows={filteredAdsets}
              selectedId={selectedAdset}
              onSelect={(id) => setSelectedAdset(id === selectedAdset ? null : id)}
              totalSpend={sumRows(filteredAdsets).spend}
            />
            <AdPanelList
              title={selectedAdset ? "소재(광고)" : selectedCampaign ? "캠페인 소재" : "전체 소재"}
              subtitle={selectedAdset ? filteredAdsets.find((s) => s.id === selectedAdset)?.name : undefined}
              rows={filteredAds}
              previews={adPreviews}
              totalSpend={sumRows(filteredAds).spend}
              onImageClick={(url, name) => setPreviewImage({ url, name })}
            />
          </div>
        </>
      )}

      {/* Empty */}
      {!loading && !hasData && selectedAccount && (
        <div className="empty"><p>조회 버튼을 눌러 데이터를 불러오세요.</p></div>
      )}
      {!selectedAccount && (
        <div className="empty"><p>광고 계정을 선택하세요.</p></div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "#000c", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            style={{ position: "relative", maxWidth: 640, maxHeight: "80vh", background: "var(--bg-1)", borderRadius: 14, overflow: "hidden", border: "1px solid var(--line)", boxShadow: "0 40px 120px #000c" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewImage.name}</p>
              <button onClick={() => setPreviewImage(null)} style={{ color: "var(--dim)", fontSize: 18 }}>&times;</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage.url} alt={previewImage.name} style={{ width: "100%", maxHeight: "70vh", objectFit: "contain" }} />
          </div>
        </div>
      )}
    </div>
  )
}

/* --- Sub-components --- */

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi">
      <p className="top">{label}</p>
      <p className="v">{value}</p>
    </div>
  )
}

function PanelList({
  icon, title, subtitle, count, rows, selectedId, onSelect, totalSpend,
}: {
  icon: React.ReactNode; title: string; subtitle?: string; count: number
  rows: ParsedRow[]; selectedId: string | null
  onSelect: (id: string) => void; totalSpend: number
}) {
  return (
    <div className="panel">
      <div className="p-head">
        <span style={{ color: "var(--dim)" }}>{icon}</span>
        <h3>{title}</h3>
        <span style={{ fontSize: 10, color: "var(--dim)", marginLeft: "auto" }}>{count}개</span>
      </div>
      {subtitle && <p style={{ fontSize: 10, color: "var(--amber)", padding: "4px 18px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</p>}
      <div style={{ flex: 1, overflowY: "auto", maxHeight: 420 }}>
        {rows.length === 0 ? (
          <p className="empty">데이터 없음</p>
        ) : rows.map((row) => {
          const pct = totalSpend > 0 ? (row.spend / totalSpend) * 100 : 0
          const action = getTopAction(row.actions)
          const active = row.id === selectedId
          return (
            <button
              key={row.id}
              onClick={() => onSelect(row.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                borderBottom: "1px solid var(--line)",
                transition: "background .15s",
                background: active ? "var(--amber-dim)" : "transparent",
                borderLeft: active ? "2px solid var(--amber)" : "2px solid transparent",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg-2)" }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent" }}
            >
              <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2 }}>{row.name}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)" }}>
                  ₩{Math.round(row.spend).toLocaleString()}
                </span>
                <span style={{ fontSize: 10, color: "var(--dim)" }}>{pct.toFixed(1)}%</span>
                <span style={{ fontSize: 10, color: "var(--dim)" }}>CTR {row.ctr.toFixed(2)}%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 10, color: "var(--dim)" }}>노출 {formatNumber(row.impressions)}</span>
                <span style={{ fontSize: 10, color: "var(--dim)" }}>클릭 {formatNumber(row.clicks)}</span>
                {action && (
                  <span style={{ fontSize: 10, color: "var(--amber)" }}>
                    {action.label} {formatNumber(action.value)}
                  </span>
                )}
              </div>
              {/* Spend bar */}
              <div style={{ marginTop: 6, width: "100%", height: 3, background: "var(--line)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "var(--amber)", borderRadius: 2, width: `${Math.min(100, pct)}%` }} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AdPanelList({
  title, subtitle, rows, previews, totalSpend, onImageClick,
}: {
  title: string; subtitle?: string; rows: ParsedRow[]
  previews: Record<string, { thumbnail_url: string | null; image_url: string | null }>
  totalSpend: number
  onImageClick: (url: string, name: string) => void
}) {
  return (
    <div className="panel">
      <div className="p-head">
        <Target style={{ width: 13, height: 13, color: "var(--dim)" }} />
        <h3>{title}</h3>
        <span style={{ fontSize: 10, color: "var(--dim)", marginLeft: "auto" }}>{rows.length}개</span>
      </div>
      {subtitle && <p style={{ fontSize: 10, color: "var(--amber)", padding: "4px 18px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</p>}
      <div style={{ flex: 1, overflowY: "auto", maxHeight: 420 }}>
        {rows.length === 0 ? (
          <p className="empty">데이터 없음</p>
        ) : rows.map((row) => {
          const preview = previews[row.id]
          const imgUrl = preview?.thumbnail_url ?? preview?.image_url
          const fullUrl = preview?.image_url ?? preview?.thumbnail_url
          const pct = totalSpend > 0 ? (row.spend / totalSpend) * 100 : 0
          const action = getTopAction(row.actions)

          return (
            <div key={row.id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", gap: 10 }}>
                {/* Thumbnail */}
                {imgUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgUrl}
                    alt={row.name}
                    style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover", flexShrink: 0, border: "1px solid var(--line)", cursor: "zoom-in" }}
                    onClick={() => onImageClick(fullUrl ?? imgUrl, row.name)}
                  />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 6, background: "var(--bg-2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <ImageIcon style={{ width: 18, height: 18, color: "var(--dimmer)" }} />
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2 }}>{row.name}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)" }}>
                      ₩{Math.round(row.spend).toLocaleString()}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--dim)" }}>{pct.toFixed(1)}%</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: "var(--dim)" }}>노출 {formatNumber(row.impressions)}</span>
                    <span style={{ fontSize: 10, color: "var(--dim)" }}>클릭 {formatNumber(row.clicks)}</span>
                    <span style={{ fontSize: 10, color: "var(--dim)" }}>CTR {row.ctr.toFixed(2)}%</span>
                    {action && (
                      <span style={{ fontSize: 10, color: "var(--amber)" }}>
                        {action.label} {formatNumber(action.value)}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: 4, width: "100%", height: 3, background: "var(--line)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "var(--plum)", borderRadius: 2, width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
