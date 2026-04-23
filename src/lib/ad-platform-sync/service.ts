import { createAdminClient } from "@/lib/supabase/admin"
import { MetaSyncAdapter } from "@/lib/ad-platform-sync/meta-adapter"
import { createSyncRun, finishSyncRun, upsertCampaigns, upsertDailyMetrics } from "@/lib/ad-platform-sync/persistence"
import type { AdPlatformSyncAdapter, SyncAccountResult, SyncRunResult } from "@/lib/ad-platform-sync/types"

function daysAgoIso(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function runMetaCampaignSync(input?: {
  brandIds?: string[]
  since?: string
  until?: string
}): Promise<SyncRunResult> {
  const adapter: AdPlatformSyncAdapter = new MetaSyncAdapter()
  const since = input?.since ?? daysAgoIso(90)
  const until = input?.until ?? todayIso()
  const accounts = await adapter.listAccounts({ brandIds: input?.brandIds })
  const sb = createAdminClient()
  const accountResults: SyncAccountResult[] = []

  for (const account of accounts) {
    const syncRunId = await createSyncRun({
      platform: "meta",
      brandId: account.brandId,
      accountRef: account.accountId,
    })

    try {
      const campaigns = await adapter.listCampaigns({ account })
      const campaignIdByExternalId = await upsertCampaigns(sb, campaigns)
      const metrics = await adapter.getDailyMetrics({ account, since, until })
      const metricResult = await upsertDailyMetrics(sb, metrics, campaignIdByExternalId)

      const result: SyncAccountResult = {
        brandId: account.brandId,
        accountId: account.accountId,
        accountName: account.accountName,
        campaignsUpserted: campaignIdByExternalId.size,
        spendRowsUpserted: metricResult.spendRowsUpserted,
        performanceRowsUpserted: metricResult.performanceRowsUpserted,
        status: "success",
      }

      accountResults.push(result)
      await finishSyncRun({
        syncRunId,
        status: "success",
        summary: {
          campaigns_upserted: result.campaignsUpserted,
          spend_rows_upserted: result.spendRowsUpserted,
          performance_rows_upserted: result.performanceRowsUpserted,
          since,
          until,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const result: SyncAccountResult = {
        brandId: account.brandId,
        accountId: account.accountId,
        accountName: account.accountName,
        campaignsUpserted: 0,
        spendRowsUpserted: 0,
        performanceRowsUpserted: 0,
        status: "failed",
        error: message,
      }

      accountResults.push(result)
      await finishSyncRun({
        syncRunId,
        status: "failed",
        summary: { since, until },
        errorMessage: message,
      })
    }
  }

  return {
    platform: "meta",
    since,
    until,
    accountResults,
  }
}
