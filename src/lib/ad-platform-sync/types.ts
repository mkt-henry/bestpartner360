export type SupportedAdPlatform = "meta" | "naver"

export type PlatformAccountRef = {
  brandId: string
  accountId: string
  accountName: string
}

export type PlatformCampaign = {
  brandId: string
  platform: SupportedAdPlatform
  externalCampaignId: string
  sourceAccountId: string
  name: string
  channel: string
  status: "active" | "paused" | "ended"
  startDate: string
  endDate: string | null
}

export type PlatformDailyMetric = {
  brandId: string
  platform: SupportedAdPlatform
  externalCampaignId: string
  channel?: string
  date: string
  spend: number
  values: Record<string, number>
}

export interface AdPlatformSyncAdapter {
  platform: SupportedAdPlatform
  listAccounts(input?: { brandIds?: string[] }): Promise<PlatformAccountRef[]>
  listCampaigns(input: { account: PlatformAccountRef }): Promise<PlatformCampaign[]>
  getDailyMetrics(input: {
    account: PlatformAccountRef
    since: string
    until: string
  }): Promise<PlatformDailyMetric[]>
}

export type SyncAccountResult = {
  brandId: string
  accountId: string
  accountName: string
  campaignsUpserted: number
  spendRowsUpserted: number
  performanceRowsUpserted: number
  status: "success" | "partial" | "failed"
  error?: string
}

export type SyncRunResult = {
  platform: SupportedAdPlatform
  since: string
  until: string
  accountResults: SyncAccountResult[]
}
