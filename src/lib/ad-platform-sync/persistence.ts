import { createAdminClient } from "@/lib/supabase/admin"
import type { PlatformCampaign, PlatformDailyMetric, SupportedAdPlatform } from "@/lib/ad-platform-sync/types"

type Sb = ReturnType<typeof createAdminClient>

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

  const spendPayload: { campaign_id: string; spend_date: string; amount: number }[] = []
  const perfPayload: { campaign_id: string; record_date: string; values: Record<string, number> }[] = []

  for (const metric of metrics) {
    const campaignId = campaignIdByExternalId.get(metric.externalCampaignId)
    if (!campaignId) continue

    spendPayload.push({
      campaign_id: campaignId,
      spend_date: metric.date,
      amount: metric.spend,
    })
    perfPayload.push({
      campaign_id: campaignId,
      record_date: metric.date,
      values: metric.values,
    })
  }

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
