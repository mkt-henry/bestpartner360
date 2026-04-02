"use client"

import { useState, useCallback } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatNumber } from "@/lib/utils"
import { RefreshCw, ImageIcon, Layers, Target, Megaphone } from "lucide-react"
import { cn } from "@/lib/utils"

/* ─── Types ─── */
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

/* ─── Constants ─── */
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

/* ─── Main ─── */
export default function MetaInsightsDashboard({ accounts }: Props) {
  const [selectedAccount, setSelectedAccount] = useState("")
  const [datePreset, setDatePreset] = useState("7d")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 3 levels of data
  const [campaigns, setCampaigns] = useState<ParsedRow[]>([])
  const [adsets, setAdsets] = useState<ParsedRow[]>([])
  const [ads, setAds] = useState<ParsedRow[]>([])
  const [daily, setDaily] = useState<InsightRow[]>([])

  // Selection state
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [selectedAdset, setSelectedAdset] = useState<string | null>(null)

  // Ad previews
  const [adPreviews, setAdPreviews] = useState<Record<string, { thumbnail_url: string | null; image_url: string | null }>>({})
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null)

  const [rawAdsets, setRawAdsets] = useState<InsightRow[]>([])
  const [rawAds, setRawAds] = useState<InsightRow[]>([])

  // Safe JSON fetch helper — returns null if response is not JSON
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

      // Fetch ad thumbnails (fire and forget)
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

  // Filtered data
  const filteredAdsets = selectedCampaign
    ? parseRows(rawAdsets.filter((r) => r.campaign_id === selectedCampaign), "adset")
    : adsets

  const filteredAds = selectedAdset
    ? parseRows(rawAds.filter((r) => r.adset_id === selectedAdset), "ad")
    : selectedCampaign
    ? parseRows(rawAds.filter((r) => r.campaign_id === selectedCampaign), "ad")
    : ads

  // Account totals
  const accountTotals = sumRows(campaigns)
  const accountCtr = accountTotals.impressions > 0 ? (accountTotals.clicks / accountTotals.impressions) * 100 : 0
  const accountCpc = accountTotals.clicks > 0 ? accountTotals.spend / accountTotals.clicks : 0

  // Daily chart
  const dailyChart = daily.map((d) => ({
    date: d.date_start?.slice(5) ?? "",
    spend: Number(d.spend ?? 0),
  }))

  // Action totals
  const allActions: Record<string, number> = {}
  for (const row of campaigns) {
    for (const a of row.actions ?? []) {
      allActions[a.action_type] = (allActions[a.action_type] ?? 0) + Number(a.value)
    }
  }
  const topActions = Object.entries(allActions).sort(([, a], [, b]) => b - a).slice(0, 6)

  const hasData = campaigns.length > 0
  const selectedAccountObj = accounts.find((a) => a.meta_account_id === selectedAccount)

  return (
    <div className="space-y-5">
      {/* ── Controls ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedAccount}
            onChange={(e) => { setSelectedAccount(e.target.value); setCampaigns([]); setAdsets([]); setAds([]) }}
            className="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            전체 조회
          </button>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setDatePreset(p.key)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors",
                datePreset === p.key
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="ml-2 text-sm text-slate-500">캠페인 · 세트 · 소재 데이터를 불러오는 중...</span>
        </div>
      )}

      {!loading && hasData && (
        <>
          {/* ── KPI Summary ── */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <MiniKpi label="지출" value={`₩${Math.round(accountTotals.spend).toLocaleString()}`} />
            <MiniKpi label="노출" value={formatNumber(accountTotals.impressions)} />
            <MiniKpi label="도달" value={formatNumber(accountTotals.reach)} />
            <MiniKpi label="클릭" value={formatNumber(accountTotals.clicks)} />
            <MiniKpi label="CTR" value={`${accountCtr.toFixed(2)}%`} />
            <MiniKpi label="CPC" value={`₩${Math.round(accountCpc).toLocaleString()}`} />
          </div>

          {/* ── Daily Spend Mini Chart + Actions ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {dailyChart.length > 1 && (
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">일별 지출</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={dailyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v) => [`₩${Math.round(Number(v)).toLocaleString()}`, "지출"]} />
                    <Bar dataKey="spend" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {topActions.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">주요 액션</h3>
                <div className="space-y-2">
                  {topActions.map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{ACTION_LABELS[type] ?? type}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatNumber(count)}</span>
                        {accountTotals.spend > 0 && (
                          <span className="text-[10px] text-slate-400 ml-1.5">
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

          {/* ── 3-Column Panel ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3" style={{ minHeight: 400 }}>
            {/* Campaign Panel */}
            <PanelList
              icon={<Megaphone className="w-3.5 h-3.5" />}
              title="캠페인"
              count={campaigns.length}
              rows={campaigns}
              selectedId={selectedCampaign}
              onSelect={(id) => { setSelectedCampaign(id === selectedCampaign ? null : id); setSelectedAdset(null) }}
              totalSpend={accountTotals.spend}
            />

            {/* Adset Panel */}
            <PanelList
              icon={<Layers className="w-3.5 h-3.5" />}
              title={selectedCampaign ? `광고세트` : "전체 광고세트"}
              subtitle={selectedCampaign ? campaigns.find((c) => c.id === selectedCampaign)?.name : undefined}
              count={filteredAdsets.length}
              rows={filteredAdsets}
              selectedId={selectedAdset}
              onSelect={(id) => setSelectedAdset(id === selectedAdset ? null : id)}
              totalSpend={sumRows(filteredAdsets).spend}
            />

            {/* Ad Panel */}
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
        <div className="text-center py-16 text-slate-400"><p>조회 버튼을 눌러 데이터를 불러오세요.</p></div>
      )}
      {!selectedAccount && (
        <div className="text-center py-16 text-slate-400"><p>광고 계정을 선택하세요.</p></div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-2xl max-h-[80vh] bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{previewImage.name}</p>
              <button onClick={() => setPreviewImage(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg">&times;</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage.url} alt={previewImage.name} className="w-full max-h-[70vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Sub-components ─── */

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5">
      <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{value}</p>
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
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{icon}</span>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <span className="text-xs text-slate-400 ml-auto">{count}개</span>
        </div>
        {subtitle && <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/50" style={{ maxHeight: 420 }}>
        {rows.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">데이터 없음</p>
        ) : rows.map((row) => {
          const pct = totalSpend > 0 ? (row.spend / totalSpend) * 100 : 0
          const action = getTopAction(row.actions)
          const active = row.id === selectedId
          return (
            <button
              key={row.id}
              onClick={() => onSelect(row.id)}
              className={cn(
                "w-full text-left px-4 py-3 transition-colors",
                active
                  ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500"
                  : "hover:bg-slate-50 dark:hover:bg-slate-700/30 border-l-2 border-transparent"
              )}
            >
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate leading-tight">{row.name}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ₩{Math.round(row.spend).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400">{pct.toFixed(1)}%</span>
                <span className="text-[10px] text-slate-400">CTR {row.ctr.toFixed(2)}%</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-slate-400">노출 {formatNumber(row.impressions)}</span>
                <span className="text-[10px] text-slate-400">클릭 {formatNumber(row.clicks)}</span>
                {action && (
                  <span className="text-[10px] text-blue-500 dark:text-blue-400">
                    {action.label} {formatNumber(action.value)}
                  </span>
                )}
              </div>
              {/* Spend bar */}
              <div className="mt-1.5 w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 dark:bg-blue-500 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
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
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <span className="text-xs text-slate-400 ml-auto">{rows.length}개</span>
        </div>
        {subtitle && <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/50" style={{ maxHeight: 420 }}>
        {rows.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">데이터 없음</p>
        ) : rows.map((row) => {
          const preview = previews[row.id]
          const imgUrl = preview?.image_url ?? preview?.thumbnail_url
          const pct = totalSpend > 0 ? (row.spend / totalSpend) * 100 : 0
          const action = getTopAction(row.actions)

          return (
            <div key={row.id} className="px-4 py-3">
              <div className="flex gap-3">
                {/* Thumbnail */}
                {imgUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgUrl}
                    alt={row.name}
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-slate-200 dark:border-slate-600 cursor-zoom-in hover:ring-2 hover:ring-blue-400 transition"
                    onClick={() => onImageClick(imgUrl, row.name)}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-5 h-5 text-slate-300 dark:text-slate-500" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate leading-tight">{row.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      ₩{Math.round(row.spend).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">노출 {formatNumber(row.impressions)}</span>
                    <span className="text-[10px] text-slate-400">클릭 {formatNumber(row.clicks)}</span>
                    <span className="text-[10px] text-slate-400">CTR {row.ctr.toFixed(2)}%</span>
                    {action && (
                      <span className="text-[10px] text-blue-500 dark:text-blue-400">
                        {action.label} {formatNumber(action.value)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400 dark:bg-purple-500 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
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
