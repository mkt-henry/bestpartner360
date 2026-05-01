import { createAdminClient } from "@/lib/supabase/admin"
import {
  extractPurchaseCount,
  extractPurchaseValue,
  fetchMetaCampaignsServer,
  fetchMetaInsightsServer,
} from "@/lib/meta-insights"
import { normalizeMetaCampaignStatus, parseNumeric, toIsoDate } from "@/lib/ad-platform-sync/normalizers"
import type {
  AdPlatformSyncAdapter,
  PlatformAccountRef,
  PlatformCampaign,
  PlatformDailyMetric,
} from "@/lib/ad-platform-sync/types"

function channelFromPublisherPlatform(platform?: string): string | undefined {
  const normalized = (platform ?? "").toLowerCase()
  if (normalized === "instagram") return "Instagram"
  if (normalized === "facebook") return "Facebook"
  return undefined
}

export class MetaSyncAdapter implements AdPlatformSyncAdapter {
  platform = "meta" as const

  async listAccounts(input?: { brandIds?: string[] }): Promise<PlatformAccountRef[]> {
    const sb = createAdminClient()
    let query = sb
      .from("meta_ad_accounts")
      .select("brand_id, meta_account_id, meta_account_name")
      .order("created_at", { ascending: true })

    if (input?.brandIds && input.brandIds.length > 0) {
      query = query.in("brand_id", input.brandIds)
    }

    const { data, error } = await query
    if (error) {
      throw new Error(`failed to load meta accounts: ${error.message}`)
    }

    return ((data ?? []) as {
      brand_id: string
      meta_account_id: string
      meta_account_name: string
    }[]).map((row) => ({
      brandId: row.brand_id,
      accountId: row.meta_account_id,
      accountName: row.meta_account_name,
    }))
  }

  async listCampaigns(input: { account: PlatformAccountRef }): Promise<PlatformCampaign[]> {
    const result = await fetchMetaCampaignsServer({ accountId: input.account.accountId })
    if ("error" in result) {
      throw new Error(result.error)
    }

    const today = new Date().toISOString().slice(0, 10)

    return result.campaigns.map((campaign) => ({
      brandId: input.account.brandId,
      platform: "meta",
      externalCampaignId: campaign.id,
      sourceAccountId: input.account.accountId,
      name: campaign.name,
      channel: "meta",
      status: normalizeMetaCampaignStatus(campaign.status, campaign.effective_status),
      startDate: toIsoDate(campaign.start_time, today),
      endDate: campaign.stop_time ? toIsoDate(campaign.stop_time, today) : null,
    }))
  }

  async getDailyMetrics(input: {
    account: PlatformAccountRef
    since: string
    until: string
  }): Promise<PlatformDailyMetric[]> {
    const result = await fetchMetaInsightsServer({
      accountId: input.account.accountId,
      since: input.since,
      until: input.until,
      level: "campaign",
      breakdowns: "publisher_platform",
      timeIncrement: 1,
    })

    if ("error" in result) {
      throw new Error(result.error)
    }

    return result.summary
      .filter((row) => row.campaign_id && row.date_start)
      .map((row) => ({
        brandId: input.account.brandId,
        platform: "meta",
        externalCampaignId: row.campaign_id!,
        channel: channelFromPublisherPlatform(row.publisher_platform),
        date: row.date_start!,
        spend: parseNumeric(row.spend),
        values: {
          impressions: parseNumeric(row.impressions),
          clicks: parseNumeric(row.clicks),
          reach: parseNumeric(row.reach),
          ctr: parseNumeric(row.ctr),
          cpc: parseNumeric(row.cpc),
          cpm: parseNumeric(row.cpm),
          frequency: parseNumeric(row.frequency),
          purchase_count: extractPurchaseCount(row),
          purchase_value: extractPurchaseValue(row),
        },
      }))
  }
}
