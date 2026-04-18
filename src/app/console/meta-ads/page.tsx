import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Topbar, FooterBar } from "../_components/Topbar"
import { MetaAdsContent } from "./MetaAdsContent"
import { createClient } from "@/lib/supabase/server"
import {
  fetchMetaInsightsServer,
  extractPurchaseValue,
  extractPurchaseCount,
  type MetaInsightRow,
} from "@/lib/meta-insights"

export const dynamic = "force-dynamic"

function daysAgoISO(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export type AdSetRow = {
  id: string
  name: string
  campaignName: string
  impressions: number
  reach: number
  clicks: number
  spend: number
  ctr: number
  cpm: number
  frequency: number
  revenue: number
  purchases: number
  roas: number
  cac: number
  optimizationGoal: string | null
}

export type CreativeRow = {
  id: string
  name: string
  adsetName: string
  campaignName: string
  impressions: number
  clicks: number
  spend: number
  ctr: number
  revenue: number
  purchases: number
  roas: number
}

export type MetaKpis = {
  spend: number
  revenue: number
  roas: number
  cac: number
  ctr: number
  cpm: number
  frequency: number
  reach: number
  impressions: number
  clicks: number
  purchases: number
}

export type HourlyCell = {
  hour: number // 0–23
  spend: number
  revenue: number
  impressions: number
  clicks: number
  purchases: number
}

export type AudienceCell = {
  age: string
  gender: string
  spend: number
  revenue: number
  impressions: number
  purchases: number
  roas: number
}

export type PlacementRow = {
  platform: string
  position: string
  spend: number
  revenue: number
  impressions: number
  purchases: number
  roas: number
  sharePct: number
}

export type MetaAdsPageData = {
  accountId: string
  accountName: string
  brandName: string
  rangeLabel: string
  kpis: MetaKpis
  adsets: AdSetRow[]
  creatives: CreativeRow[]
  hourly: HourlyCell[]
  audiences: AudienceCell[]
  placements: PlacementRow[]
}

function sumAccountKpis(rows: MetaInsightRow[]): MetaKpis {
  const spend = rows.reduce((s, r) => s + Number(r.spend ?? 0), 0)
  const revenue = rows.reduce((s, r) => s + extractPurchaseValue(r), 0)
  const impressions = rows.reduce((s, r) => s + Number(r.impressions ?? 0), 0)
  const clicks = rows.reduce((s, r) => s + Number(r.clicks ?? 0), 0)
  const reach = rows.reduce((s, r) => s + Number(r.reach ?? 0), 0)
  const purchases = rows.reduce((s, r) => s + extractPurchaseCount(r), 0)
  const frequency = reach > 0 ? impressions / reach : 0
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0
  const roas = spend > 0 ? revenue / spend : 0
  const cac = purchases > 0 ? spend / purchases : 0
  return { spend, revenue, roas, cac, ctr, cpm, frequency, reach, impressions, clicks, purchases }
}

function EmptyShell({ brandName, message }: { brandName: string; message: string }) {
  return (
    <>
      <Topbar
        crumbs={[
          { label: "워크스페이스" },
          { label: brandName },
          { label: "Meta Ads", strong: true },
        ]}
      />
      <div className="canvas">
        <div className="panel">
          <div className="p-body" style={{ padding: 40, textAlign: "center", color: "var(--dim)" }}>
            {message}
          </div>
        </div>
      </div>
      <FooterBar />
    </>
  )
}

export default async function ConsoleMetaAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandIdsHeader = h.get("x-user-brand-ids")
  const brandName = h.get("x-user-brand-name")
    ? decodeURIComponent(h.get("x-user-brand-name")!)
    : "브랜드"

  if (!userId) redirect("/login")
  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []
  const sp = await searchParams
  const rangeDays = Math.min(90, Math.max(1, Number(sp.range) || 14))

  if (brandIds.length === 0) {
    return <EmptyShell brandName={brandName} message="연결된 브랜드가 없습니다." />
  }

  const supabase = await createClient()
  const { data: accounts } = await supabase
    .from("meta_ad_accounts")
    .select("id, meta_account_id, meta_account_name")
    .in("brand_id", brandIds)
    .limit(1)

  const account = accounts?.[0]
  if (!account) {
    redirect("/console")
  }

  const since = daysAgoISO(rangeDays - 1)
  const until = daysAgoISO(0)

  const [accountRes, adsetRes, adRes, hourlyRes, audienceRes, placementRes] = await Promise.all([
    fetchMetaInsightsServer({ accountId: account.meta_account_id, since, until, level: "account" }),
    fetchMetaInsightsServer({ accountId: account.meta_account_id, since, until, level: "adset" }),
    fetchMetaInsightsServer({ accountId: account.meta_account_id, since, until, level: "ad" }),
    fetchMetaInsightsServer({
      accountId: account.meta_account_id,
      since,
      until,
      level: "account",
      breakdowns: "hourly_stats_aggregated_by_advertiser_time_zone",
    }),
    fetchMetaInsightsServer({
      accountId: account.meta_account_id,
      since,
      until,
      level: "account",
      breakdowns: "age,gender",
    }),
    fetchMetaInsightsServer({
      accountId: account.meta_account_id,
      since,
      until,
      level: "account",
      breakdowns: "publisher_platform,platform_position",
    }),
  ])

  if ("error" in accountRes) {
    return <EmptyShell brandName={brandName} message={`Meta API 오류: ${accountRes.error}`} />
  }

  const accountRows = accountRes.summary
  const adsetRows = "error" in adsetRes ? [] : adsetRes.summary
  const adRows = "error" in adRes ? [] : adRes.summary

  const kpis = sumAccountKpis(accountRows)

  const adsets: AdSetRow[] = adsetRows
    .filter((r) => r.adset_id)
    .map((r) => {
      const spend = Number(r.spend ?? 0)
      const impressions = Number(r.impressions ?? 0)
      const clicks = Number(r.clicks ?? 0)
      const reach = Number(r.reach ?? 0)
      const revenue = extractPurchaseValue(r)
      const purchases = extractPurchaseCount(r)
      return {
        id: r.adset_id!,
        name: r.adset_name ?? r.adset_id!,
        campaignName: r.campaign_name ?? "",
        impressions,
        reach,
        clicks,
        spend,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        frequency: reach > 0 ? impressions / reach : 0,
        revenue,
        purchases,
        roas: spend > 0 ? revenue / spend : 0,
        cac: purchases > 0 ? spend / purchases : 0,
        optimizationGoal: r.optimization_goal ?? null,
      }
    })
    .sort((a, b) => b.revenue - a.revenue || b.spend - a.spend)

  const creatives: CreativeRow[] = adRows
    .filter((r) => r.ad_id)
    .map((r) => {
      const spend = Number(r.spend ?? 0)
      const impressions = Number(r.impressions ?? 0)
      const clicks = Number(r.clicks ?? 0)
      const revenue = extractPurchaseValue(r)
      const purchases = extractPurchaseCount(r)
      return {
        id: r.ad_id!,
        name: r.ad_name ?? r.ad_id!,
        adsetName: r.adset_name ?? "",
        campaignName: r.campaign_name ?? "",
        impressions,
        clicks,
        spend,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        revenue,
        purchases,
        roas: spend > 0 ? revenue / spend : 0,
      }
    })
    .sort((a, b) => b.revenue - a.revenue || b.spend - a.spend)
    .slice(0, 24)

  const hourlyRows = "error" in hourlyRes ? [] : hourlyRes.summary
  const audienceRows = "error" in audienceRes ? [] : audienceRes.summary
  const placementRows = "error" in placementRes ? [] : placementRes.summary

  // Hourly: "HH:MM:SS - HH:MM:SS" → hour bucket
  const hourlyMap = new Map<number, HourlyCell>()
  for (let h = 0; h < 24; h++) {
    hourlyMap.set(h, { hour: h, spend: 0, revenue: 0, impressions: 0, clicks: 0, purchases: 0 })
  }
  for (const r of hourlyRows) {
    const raw = r.hourly_stats_aggregated_by_advertiser_time_zone
    if (!raw) continue
    const hour = parseInt(raw.slice(0, 2), 10)
    if (Number.isNaN(hour)) continue
    const cell = hourlyMap.get(hour)!
    cell.spend += Number(r.spend ?? 0)
    cell.revenue += extractPurchaseValue(r)
    cell.impressions += Number(r.impressions ?? 0)
    cell.clicks += Number(r.clicks ?? 0)
    cell.purchases += extractPurchaseCount(r)
  }
  const hourly = Array.from(hourlyMap.values())

  // Audiences age × gender
  const audiences: AudienceCell[] = audienceRows
    .filter((r) => r.age && r.gender)
    .map((r) => {
      const spend = Number(r.spend ?? 0)
      const revenue = extractPurchaseValue(r)
      return {
        age: r.age!,
        gender: r.gender!,
        spend,
        revenue,
        impressions: Number(r.impressions ?? 0),
        purchases: extractPurchaseCount(r),
        roas: spend > 0 ? revenue / spend : 0,
      }
    })

  // Placements
  const placementRowsRaw: PlacementRow[] = placementRows
    .filter((r) => r.publisher_platform)
    .map((r) => {
      const spend = Number(r.spend ?? 0)
      const revenue = extractPurchaseValue(r)
      return {
        platform: r.publisher_platform!,
        position: r.platform_position ?? "—",
        spend,
        revenue,
        impressions: Number(r.impressions ?? 0),
        purchases: extractPurchaseCount(r),
        roas: spend > 0 ? revenue / spend : 0,
        sharePct: 0,
      }
    })
  const totalPlacementImpr = placementRowsRaw.reduce((s, p) => s + p.impressions, 0)
  const placements = placementRowsRaw
    .map((p) => ({
      ...p,
      sharePct: totalPlacementImpr > 0 ? (p.impressions / totalPlacementImpr) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.spend - a.spend)

  const data: MetaAdsPageData = {
    accountId: account.meta_account_id,
    accountName: account.meta_account_name,
    brandName,
    rangeLabel: `${since} — ${until}`,
    kpis,
    adsets,
    creatives,
    hourly,
    audiences,
    placements,
  }

  return (
    <>
      <Topbar
        crumbs={[
          { label: "워크스페이스" },
          { label: brandName },
          { label: "Meta Ads", strong: true },
        ]}
      />

      <div className="detail-head">
        <Link className="back-link" href="/console">
          ← 개요로 돌아가기
        </Link>
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic">M</span>
              <span>
                Meta Ads · {data.accountName} · {data.accountId}
              </span>
            </div>
            <h1>
              Meta <em>Ads</em>
            </h1>
            <div className="dh-meta">
              <span className="status-pill">실시간</span>
              <span className="sep">·</span>
              <span className="m">{data.rangeLabel}</span>
              <span className="sep">·</span>
              <span className="m">광고 세트 {adsets.length}개</span>
              <span className="sep">·</span>
              <span className="m">소재 {creatives.length}개</span>
            </div>
          </div>
          <div className="dh-actions">
            <span className="num">
              {kpis.roas > 0 ? kpis.roas.toFixed(2) : "—"}
              <small>× ROAS</small>
            </span>
          </div>
        </div>
      </div>

      <MetaAdsContent data={data} />

      <FooterBar />
    </>
  )
}
