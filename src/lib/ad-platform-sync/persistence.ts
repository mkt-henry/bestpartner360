import { createAdminClient } from "@/lib/supabase/admin"
import type { PlatformCampaign, PlatformDailyMetric, SupportedAdPlatform } from "@/lib/ad-platform-sync/types"

type Sb = ReturnType<typeof createAdminClient>

type ManualCampaignForMetric = {
  id: string
  brand_id: string
  channel: string
  start_date: string
  end_date: string | null
}

type AggregatedDailyMetric = {
  campaign_id: string
  date: string
  amount: number
  values: Record<string, number>
}

export async function createSyncRun(params: {
  platform: SupportedAdPlatform
  brandId: string
  accountRef: string
}): Promise<string | null> {
  const sb = createAdminClient()
  const { data, error } = await sb
    .from("sync_runs")
    .insert({
      platform: params.platform,
      brand_id: params.brandId,
      account_ref: params.accountRef,
      status: "running",
      summary: {},
    })
    .select("id")
    .single()

  if (error) {
    console.error("[createSyncRun] failed:", error)
    return null
  }

  return data.id as string
}

export async function finishSyncRun(params: {
  syncRunId: string | null
  status: "success" | "partial" | "failed"
  summary: Record<string, unknown>
  errorMessage?: string
}): Promise<void> {
  if (!params.syncRunId) return

  const sb = createAdminClient()
  const { error } = await sb
    .from("sync_runs")
    .update({
      status: params.status,
      finished_at: new Date().toISOString(),
      summary: params.summary,
      error_message: params.errorMessage ?? null,
    })
    .eq("id", params.syncRunId)

  if (error) {
    console.error("[finishSyncRun] failed:", error)
  }
}

export async function upsertCampaigns(
  sb: Sb,
  campaigns: PlatformCampaign[]
): Promise<Map<string, string>> {
  if (campaigns.length === 0) return new Map()

  const payload = campaigns.map((campaign) => ({
    brand_id: campaign.brandId,
    name: campaign.name,
    channel: campaign.channel,
    status: campaign.status,
    start_date: campaign.startDate,
    end_date: campaign.endDate,
    platform: campaign.platform,
    external_campaign_id: campaign.externalCampaignId,
    source_account_id: campaign.sourceAccountId,
    last_synced_at: new Date().toISOString(),
  }))

  const { data, error } = await sb
    .from("campaigns")
    .upsert(payload, { onConflict: "platform,external_campaign_id" })
    .select("id, external_campaign_id")

  if (error) {
    throw new Error(`campaign upsert failed: ${error.message}`)
  }

  return new Map(
    ((data ?? []) as { id: string; external_campaign_id: string | null }[])
      .filter((row) => Boolean(row.external_campaign_id))
      .map((row) => [row.external_campaign_id!, row.id])
  )
}

export async function upsertDailyMetrics(
  sb: Sb,
  metrics: PlatformDailyMetric[],
  campaignIdByExternalId: Map<string, string>
): Promise<{ spendRowsUpserted: number; performanceRowsUpserted: number }> {
  if (metrics.length === 0) {
    return { spendRowsUpserted: 0, performanceRowsUpserted: 0 }
  }

  const manualCampaigns = await loadManualCampaignsForMetrics(sb, metrics)
  const aggregated = new Map<string, AggregatedDailyMetric>()

  for (const metric of metrics) {
    const campaignId =
      findManualCampaignIdForMetric(manualCampaigns, metric) ??
      campaignIdByExternalId.get(metric.externalCampaignId)
    if (!campaignId) continue

    const key = `${campaignId}:${metric.date}`
    const current = aggregated.get(key) ?? {
      campaign_id: campaignId,
      date: metric.date,
      amount: 0,
      values: {},
    }

    current.amount += metric.spend
    for (const [metricKey, value] of Object.entries(metric.values)) {
      current.values[metricKey] = (current.values[metricKey] ?? 0) + value
    }
    aggregated.set(key, current)
  }

  const rows = Array.from(aggregated.values()).map(finalizeAggregatedMetric)
  const spendPayload = rows.map((row) => ({
    campaign_id: row.campaign_id,
    spend_date: row.date,
    amount: row.amount,
  }))
  const perfPayload = rows.map((row) => ({
    campaign_id: row.campaign_id,
    record_date: row.date,
    values: row.values,
  }))

  if (spendPayload.length > 0) {
    const { error } = await sb
      .from("spend_records")
      .upsert(spendPayload, { onConflict: "campaign_id,spend_date" })
    if (error) {
      throw new Error(`spend upsert failed: ${error.message}`)
    }
  }

  if (perfPayload.length > 0) {
    const { error } = await sb
      .from("performance_records")
      .upsert(perfPayload, { onConflict: "campaign_id,record_date" })
    if (error) {
      throw new Error(`performance upsert failed: ${error.message}`)
    }
  }

  return {
    spendRowsUpserted: spendPayload.length,
    performanceRowsUpserted: perfPayload.length,
  }
}

async function loadManualCampaignsForMetrics(
  sb: Sb,
  metrics: PlatformDailyMetric[]
): Promise<ManualCampaignForMetric[]> {
  const brandIds = Array.from(new Set(metrics.map((metric) => metric.brandId).filter(Boolean)))
  const channels = Array.from(new Set(metrics.map((metric) => metric.channel).filter(Boolean))) as string[]

  if (brandIds.length === 0 || channels.length === 0) return []

  const { data, error } = await sb
    .from("campaigns")
    .select("id, brand_id, channel, start_date, end_date")
    .in("brand_id", brandIds)
    .in("channel", channels)
    .is("platform", null)
    .order("start_date", { ascending: false })

  if (error) {
    throw new Error(`manual campaign lookup failed: ${error.message}`)
  }

  return (data ?? []) as ManualCampaignForMetric[]
}

function findManualCampaignIdForMetric(
  campaigns: ManualCampaignForMetric[],
  metric: PlatformDailyMetric
): string | undefined {
  if (!metric.channel) return undefined

  const channel = metric.channel.toLowerCase()
  return campaigns.find((campaign) => {
    if (campaign.brand_id !== metric.brandId) return false
    if (campaign.channel.toLowerCase() !== channel) return false
    if (campaign.start_date && campaign.start_date > metric.date) return false
    if (campaign.end_date && campaign.end_date < metric.date) return false
    return true
  })?.id
}

function finalizeAggregatedMetric(metric: AggregatedDailyMetric): AggregatedDailyMetric {
  const impressions = metric.values.impressions ?? 0
  const clicks = metric.values.clicks ?? 0
  const reach = metric.values.reach ?? 0

  if (impressions > 0) {
    metric.values.ctr = (clicks / impressions) * 100
    metric.values.cpm = (metric.amount / impressions) * 1000
  }
  if (clicks > 0) {
    metric.values.cpc = metric.amount / clicks
  }
  if (reach > 0) {
    metric.values.frequency = impressions / reach
  }

  return metric
}
