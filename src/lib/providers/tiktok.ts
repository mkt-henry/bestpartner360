import { getTiktokCredentials } from "@/lib/credentials"
import { listTiktokAdvertisers } from "@/lib/tiktok-insights"
import { tiktokMetadata } from "./public"
import type { ProviderDefinition } from "./types"

export const tiktokProvider: ProviderDefinition = {
  ...tiktokMetadata,
  async hasCredentials() {
    const creds = await getTiktokCredentials()
    return !!(creds?.access_token && creds?.app_id && creds?.secret)
  },
  async listAccounts() {
    const result = await listTiktokAdvertisers()
    if ("error" in result) {
      const friendly =
        result.error === "TikTok credentials missing"
          ? "TikTok API 키가 설정되지 않았습니다. 설정 페이지에서 입력해주세요."
          : result.error
      return { ok: false, error: friendly, status: 500 }
    }
    const accounts = result.advertisers.map((a) => ({
      id: a.advertiser_id,
      name: a.advertiser_name,
      status: a.status ?? null,
    }))
    return { ok: true, accounts }
  },
}
