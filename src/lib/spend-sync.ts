import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMetaCredentials, getNaverCredentials } from "@/lib/credentials"

export type SyncResult = {
  ok: boolean
  synced?: number
  message?: string
  unmatched?: string[]
  unmatched_tps?: string[]
  error?: string
  status?: number
}

interface DbCampaign {
  id: string
  channel: string
  sync_tag: string
  start_date: string
  end_date: string | null
}

// ============================================================
// META (Facebook / Instagram)
// ============================================================

const META_API = "https://graph.facebook.com/v21.0"
const META_CHANNELS = ["Instagram", "Facebook"]

interface CampaignInsightRow {
  date_start: string
  date_stop: string
  campaign_id?: string
  campaign_name?: string
  spend?: string
}

export async function syncMetaSpendForBrand(brandId: string): Promise<SyncResult> {
  const creds = await getMetaCredentials()
  if (!creds) {
    return {
      ok: false,
      error: "Meta API 자격증명이 없습니다. 설정에서 등록해주세요.",
      status: 400,
    }
  }

  const admin = createAdminClient()

  const [accountsRes, campaignsRes] = await Promise.all([
    admin.from("meta_ad_accounts").select("meta_account_id").eq("brand_id", brandId),
    admin
      .from("campaigns")
      .select("id, channel, sync_tag, start_date, end_date")
      .eq("brand_id", brandId)
      .in("channel", META_CHANNELS)
      .not("sync_tag", "is", null),
  ])

  if (accountsRes.error) return { ok: false, error: accountsRes.error.message, status: 500 }
  if (campaignsRes.error) return { ok: false, error: campaignsRes.error.message, status: 500 }

  const accounts = accountsRes.data ?? []
  const dbCampaigns = (campaignsRes.data ?? []).filter(
    (c): c is DbCampaign => typeof c.sync_tag === "string" && c.sync_tag.trim().length > 0
  )

  if (accounts.length === 0) {
    return { ok: false, error: "이 브랜드에 연결된 Meta 광고 계정이 없습니다.", status: 400 }
  }
  if (dbCampaigns.length === 0) {
    return {
      ok: true,
      synced: 0,
      message: "매칭 설명(sync_tag)이 설정된 Instagram/Facebook 기간 세트가 없습니다.",
    }
  }

  const earliest = dbCampaigns.reduce(
    (min, c) => (c.start_date < min ? c.start_date : min),
    "9999-12-31"
  )
  const latest = dbCampaigns.reduce(
    (max, c) => ((c.end_date ?? "0001-01-01") > max ? c.end_date ?? max : max),
    "0001-01-01"
  )

  const aggregated = new Map<string, number>()
  const unmatched = new Set<string>()

  for (const acc of accounts) {
    const params = new URLSearchParams({
      access_token: creds.access_token,
      fields: "spend,campaign_id,campaign_name",
      time_range: JSON.stringify({ since: earliest, until: latest }),
      time_increment: "1",
      level: "campaign",
      limit: "500",
    })

    let url: string | null = `${META_API}/${acc.meta_account_id}/insights?${params.toString()}`
    const rows: CampaignInsightRow[] = []

    while (url) {
      const res: Response = await fetch(url)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return {
          ok: false,
          error: `Meta API 오류 (${acc.meta_account_id}): ${err.error?.message ?? res.statusText}`,
          status: 502,
        }
      }
      const json = await res.json()
      rows.push(...((json.data ?? []) as CampaignInsightRow[]))
      url = json.paging?.next ?? null
    }

    for (const row of rows) {
      const name = row.campaign_name ?? ""
      const date = row.date_start
      const amount = Number(row.spend ?? "0")
      if (!name || !amount) continue

      const target = dbCampaigns.find((c) => {
        const end = c.end_date ?? "9999-12-31"
        if (date < c.start_date || date > end) return false
        return name.toLowerCase().includes(c.sync_tag.toLowerCase())
      })
      if (!target) {
        unmatched.add(name)
        continue
      }

      const key = `${target.id}|${date}`
      aggregated.set(key, (aggregated.get(key) ?? 0) + amount)
    }
  }

  const allTargetCampaignIds = dbCampaigns.map((c) => c.id)
  await admin
    .from("spend_records")
    .delete()
    .in("campaign_id", allTargetCampaignIds)
    .gte("spend_date", earliest)
    .lte("spend_date", latest)

  if (aggregated.size === 0) {
    const hint = unmatched.size > 0
      ? ` (분류되지 않은 Meta 캠페인: ${Array.from(unmatched).slice(0, 3).join(", ")}${unmatched.size > 3 ? " 외" : ""})`
      : ""
    return { ok: true, synced: 0, message: `지출 데이터가 없습니다.${hint}` }
  }

  const rows = Array.from(aggregated.entries()).map(([key, amount]) => {
    const [campaign_id, spend_date] = key.split("|")
    return { campaign_id, spend_date, amount }
  })

  const { error: upsertErr } = await admin
    .from("spend_records")
    .upsert(rows, { onConflict: "campaign_id,spend_date" })

  if (upsertErr) return { ok: false, error: upsertErr.message, status: 500 }

  return { ok: true, synced: rows.length, unmatched: Array.from(unmatched) }
}

// ============================================================
// NAVER (검색광고)
// ============================================================

const NAVER_API = "https://api.searchad.naver.com"
const NAVER_TP_TO_TAG: Record<string, string> = {
  WEB_SITE: "파워링크",
  BRAND_SEARCH: "브랜드검색",
  SHOPPING: "쇼핑검색",
  POWER_CONTENTS: "파워컨텐츠",
}

interface NaverCampaign {
  nccCampaignId: string
  name: string
  campaignTp: string
}

interface StatRow {
  id: string
  breakdown?: string
  salesAmt?: number | string
}

interface StatsResponse {
  data?: StatRow[]
}

type NaverCreds = { api_key: string; secret_key: string; customer_id: string }

function naverSignature(timestamp: string, method: string, path: string, secretKey: string) {
  return crypto
    .createHmac("sha256", secretKey)
    .update(`${timestamp}.${method}.${path}`)
    .digest("base64")
}

function naverFetch(method: string, path: string, creds: NaverCreds, customerId: string) {
  const timestamp = String(Date.now())
  return fetch(`${NAVER_API}${path}`, {
    method,
    headers: {
      "X-API-KEY": creds.api_key,
      "X-CUSTOMER": customerId,
      "X-Timestamp": timestamp,
      "X-Signature": naverSignature(timestamp, method, path, creds.secret_key),
    },
    cache: "no-store",
  })
}

export async function syncNaverSpendForBrand(brandId: string): Promise<SyncResult> {
  const creds = await getNaverCredentials()
  if (!creds) {
    return {
      ok: false,
      error: "Naver API 자격증명이 없습니다. 설정에서 등록해주세요.",
      status: 400,
    }
  }

  const admin = createAdminClient()

  const [accountsRes, campaignsRes] = await Promise.all([
    admin.from("naver_ad_accounts").select("naver_customer_id").eq("brand_id", brandId),
    admin
      .from("campaigns")
      .select("id, channel, sync_tag, start_date, end_date")
      .eq("brand_id", brandId)
      .eq("channel", "Naver")
      .not("sync_tag", "is", null),
  ])

  if (accountsRes.error) return { ok: false, error: accountsRes.error.message, status: 500 }
  if (campaignsRes.error) return { ok: false, error: campaignsRes.error.message, status: 500 }

  const accounts = accountsRes.data ?? []
  const dbCampaigns = (campaignsRes.data ?? []).filter(
    (c): c is DbCampaign => typeof c.sync_tag === "string" && c.sync_tag.trim().length > 0
  )

  if (accounts.length === 0) {
    return { ok: false, error: "이 브랜드에 연결된 Naver 광고 계정이 없습니다.", status: 400 }
  }
  if (dbCampaigns.length === 0) {
    return {
      ok: true,
      synced: 0,
      message: "매칭 설명(파워링크/브랜드검색/쇼핑검색/파워컨텐츠)이 설정된 Naver 기간 세트가 없습니다.",
    }
  }

  const earliest = dbCampaigns.reduce(
    (min, c) => (c.start_date < min ? c.start_date : min),
    "9999-12-31"
  )
  const latest = dbCampaigns.reduce(
    (max, c) => ((c.end_date ?? "0001-01-01") > max ? c.end_date ?? max : max),
    "0001-01-01"
  )

  const aggregated = new Map<string, number>()
  const unmatchedTps = new Set<string>()

  for (const acc of accounts) {
    const customerId = String(acc.naver_customer_id)

    const campRes = await naverFetch("GET", "/ncc/campaigns", creds, customerId)
    if (!campRes.ok) {
      const err = await campRes.json().catch(() => ({}))
      return {
        ok: false,
        error: `Naver 캠페인 조회 실패 (${customerId}): ${err.title ?? err.message ?? campRes.statusText}`,
        status: 502,
      }
    }
    const naverCampaigns = (await campRes.json()) as NaverCampaign[]

    for (const nc of naverCampaigns) {
      const tag = NAVER_TP_TO_TAG[nc.campaignTp]
      if (!tag) {
        unmatchedTps.add(nc.campaignTp)
        continue
      }

      const query = new URLSearchParams({
        id: nc.nccCampaignId,
        fields: JSON.stringify(["salesAmt"]),
        timeRange: JSON.stringify({ since: earliest, until: latest }),
        breakdown: "dt",
      })
      const path = `/stats?${query.toString()}`
      const statsRes = await naverFetch("GET", path, creds, customerId)
      if (!statsRes.ok) {
        const err = await statsRes.json().catch(() => ({}))
        return {
          ok: false,
          error: `Naver stats 조회 실패 (${nc.nccCampaignId}): ${err.title ?? err.message ?? statsRes.statusText}`,
          status: 502,
        }
      }
      const statsJson = (await statsRes.json()) as StatsResponse
      const statRows = statsJson.data ?? []

      for (const row of statRows) {
        const date = row.breakdown
        const amount = Number(row.salesAmt ?? 0)
        if (!date || !amount) continue

        const target = dbCampaigns.find((c) => {
          if (c.sync_tag !== tag) return false
          const end = c.end_date ?? "9999-12-31"
          return date >= c.start_date && date <= end
        })
        if (!target) continue

        const key = `${target.id}|${date}`
        aggregated.set(key, (aggregated.get(key) ?? 0) + amount)
      }
    }
  }

  const allTargetCampaignIds = dbCampaigns.map((c) => c.id)
  await admin
    .from("spend_records")
    .delete()
    .in("campaign_id", allTargetCampaignIds)
    .gte("spend_date", earliest)
    .lte("spend_date", latest)

  if (aggregated.size === 0) {
    const hint = unmatchedTps.size > 0
      ? ` (매칭되지 않은 Naver 캠페인 유형: ${Array.from(unmatchedTps).join(", ")})`
      : ""
    return { ok: true, synced: 0, message: `지출 데이터가 없습니다.${hint}` }
  }

  const rows = Array.from(aggregated.entries()).map(([key, amount]) => {
    const [campaign_id, spend_date] = key.split("|")
    return { campaign_id, spend_date, amount }
  })

  const { error: upsertErr } = await admin
    .from("spend_records")
    .upsert(rows, { onConflict: "campaign_id,spend_date" })

  if (upsertErr) return { ok: false, error: upsertErr.message, status: 500 }

  return { ok: true, synced: rows.length, unmatched_tps: Array.from(unmatchedTps) }
}
