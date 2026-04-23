import { getMetaCredentials } from "@/lib/credentials"

const META_API = "https://graph.facebook.com/v21.0"

export type MetaAction = { action_type: string; value: string }

export type MetaInsightRow = {
  campaign_id?: string
  campaign_name?: string
  date_start?: string
  date_stop?: string
  adset_id?: string
  adset_name?: string
  ad_id?: string
  ad_name?: string
  impressions?: string
  reach?: string
  clicks?: string
  spend?: string
  cpc?: string
  cpm?: string
  ctr?: string
  frequency?: string
  actions?: MetaAction[]
  action_values?: MetaAction[]
  cost_per_action_type?: MetaAction[]
  optimization_goal?: string
  // Breakdowns
  hourly_stats_aggregated_by_advertiser_time_zone?: string
  age?: string
  gender?: string
  country?: string
  publisher_platform?: string
  platform_position?: string
}

export type MetaCampaignRow = {
  id: string
  name: string
  status?: string
  effective_status?: string
  start_time?: string
  stop_time?: string
}

const LEVEL_FIELDS: Record<string, string> = {
  account: "impressions,reach,clicks,spend,cpc,cpm,ctr,frequency,actions,action_values,cost_per_action_type",
  campaign:
    "campaign_id,campaign_name,date_start,date_stop,impressions,reach,clicks,spend,cpc,cpm,ctr,frequency,actions,action_values,cost_per_action_type",
  adset:
    "campaign_id,campaign_name,adset_id,adset_name,impressions,reach,clicks,spend,cpc,cpm,ctr,frequency,actions,action_values,cost_per_action_type,optimization_goal",
  ad: "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,reach,clicks,spend,cpc,cpm,ctr,frequency,actions,action_values,cost_per_action_type",
}

export async function fetchMetaInsightsServer(params: {
  accountId: string
  since: string
  until: string
  level: "account" | "campaign" | "adset" | "ad"
  breakdowns?: string
  timeIncrement?: number
}): Promise<{ summary: MetaInsightRow[] } | { error: string }> {
  const creds = await getMetaCredentials()
  if (!creds) return { error: "Meta credentials missing" }

  const fields = LEVEL_FIELDS[params.level] ?? LEVEL_FIELDS.account
  const qs = new URLSearchParams({
    access_token: creds.access_token,
    fields,
    time_range: JSON.stringify({ since: params.since, until: params.until }),
    level: params.level,
    limit: "500",
  })
  if (params.breakdowns) qs.set("breakdowns", params.breakdowns)
  if (params.timeIncrement) qs.set("time_increment", String(params.timeIncrement))

  try {
    const res = await fetch(`${META_API}/${params.accountId}/insights?${qs.toString()}`, {
      cache: "no-store",
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      return { error: err?.error?.message ?? `Meta API HTTP ${res.status}` }
    }
    const json = (await res.json()) as { data?: MetaInsightRow[]; paging?: { next?: string } }
    let all: MetaInsightRow[] = json.data ?? []
    let next = json.paging?.next
    while (next && all.length < 500) {
      const pageRes = await fetch(next, { cache: "no-store" })
      if (!pageRes.ok) break
      const pageJson = (await pageRes.json()) as { data?: MetaInsightRow[]; paging?: { next?: string } }
      all = all.concat(pageJson.data ?? [])
      next = pageJson.paging?.next
    }
    return { summary: all }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "unknown" }
  }
}

export async function fetchMetaCampaignsServer(params: {
  accountId: string
}): Promise<{ campaigns: MetaCampaignRow[] } | { error: string }> {
  const creds = await getMetaCredentials()
  if (!creds) return { error: "Meta credentials missing" }

  const qs = new URLSearchParams({
    access_token: creds.access_token,
    fields: "id,name,status,effective_status,start_time,stop_time",
    limit: "500",
  })

  try {
    const res = await fetch(`${META_API}/${params.accountId}/campaigns?${qs.toString()}`, {
      cache: "no-store",
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      return { error: err?.error?.message ?? `Meta API HTTP ${res.status}` }
    }

    const json = (await res.json()) as { data?: MetaCampaignRow[]; paging?: { next?: string } }
    let all: MetaCampaignRow[] = json.data ?? []
    let next = json.paging?.next

    while (next && all.length < 500) {
      const pageRes = await fetch(next, { cache: "no-store" })
      if (!pageRes.ok) break
      const pageJson = (await pageRes.json()) as { data?: MetaCampaignRow[]; paging?: { next?: string } }
      all = all.concat(pageJson.data ?? [])
      next = pageJson.paging?.next
    }

    return { campaigns: all }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "unknown" }
  }
}

// Parse purchase value from action_values (preferred) or actions array
export function extractPurchaseValue(row: MetaInsightRow): number {
  const pickPurchase = (arr?: MetaAction[]) => {
    if (!arr) return 0
    const candidates = ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"]
    for (const t of candidates) {
      const found = arr.find((a) => a.action_type === t)
      if (found) return Number(found.value) || 0
    }
    return 0
  }
  return pickPurchase(row.action_values)
}

export function extractPurchaseCount(row: MetaInsightRow): number {
  const pickPurchase = (arr?: MetaAction[]) => {
    if (!arr) return 0
    const candidates = ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"]
    for (const t of candidates) {
      const found = arr.find((a) => a.action_type === t)
      if (found) return Number(found.value) || 0
    }
    return 0
  }
  return pickPurchase(row.actions)
}
