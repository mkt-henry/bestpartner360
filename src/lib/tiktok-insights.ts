import { getTiktokCredentials } from "@/lib/credentials"

const TIKTOK_API = "https://business-api.tiktok.com/open_api/v1.3"

export type TiktokDataLevel =
  | "AUCTION_ADVERTISER"
  | "AUCTION_CAMPAIGN"
  | "AUCTION_ADGROUP"
  | "AUCTION_AD"

export interface TiktokReportRow {
  dimensions: Record<string, string>
  metrics: Record<string, string>
}

const DEFAULT_METRICS = [
  "spend",
  "impressions",
  "reach",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "frequency",
  "conversion",
  "cost_per_conversion",
  "conversion_rate",
  "total_purchase_value",
]

const LEVEL_DIMENSIONS: Record<TiktokDataLevel, string[]> = {
  AUCTION_ADVERTISER: ["advertiser_id"],
  AUCTION_CAMPAIGN: ["campaign_id"],
  AUCTION_ADGROUP: ["adgroup_id"],
  AUCTION_AD: ["ad_id"],
}

interface TiktokApiResponse<T> {
  code: number
  message: string
  request_id?: string
  data?: T
}

interface TiktokReportData {
  list?: TiktokReportRow[]
  page_info?: { page: number; total_number: number; page_size: number; total_page: number }
}

export async function fetchTiktokReport(params: {
  advertiserId: string
  startDate: string // YYYY-MM-DD
  endDate: string
  dataLevel: TiktokDataLevel
  metrics?: string[]
  extraDimensions?: string[] // e.g. ["stat_time_day"] for daily breakdown
}): Promise<{ rows: TiktokReportRow[] } | { error: string }> {
  const creds = await getTiktokCredentials()
  if (!creds) return { error: "TikTok credentials missing" }

  const dimensions = [
    ...LEVEL_DIMENSIONS[params.dataLevel],
    ...(params.extraDimensions ?? []),
  ]
  const metrics = params.metrics ?? DEFAULT_METRICS

  const url = new URL(`${TIKTOK_API}/report/integrated/get/`)
  url.searchParams.set("advertiser_id", params.advertiserId)
  url.searchParams.set("report_type", "BASIC")
  url.searchParams.set("data_level", params.dataLevel)
  url.searchParams.set("dimensions", JSON.stringify(dimensions))
  url.searchParams.set("metrics", JSON.stringify(metrics))
  url.searchParams.set("start_date", params.startDate)
  url.searchParams.set("end_date", params.endDate)
  url.searchParams.set("page_size", "1000")

  const all: TiktokReportRow[] = []
  let page = 1

  while (true) {
    url.searchParams.set("page", String(page))
    const res = await fetch(url.toString(), {
      headers: { "Access-Token": creds.access_token },
      cache: "no-store",
    })
    if (!res.ok) {
      return { error: `TikTok API HTTP ${res.status}` }
    }
    const json = (await res.json()) as TiktokApiResponse<TiktokReportData>
    if (json.code !== 0) {
      console.error(`[tiktok] report error: code=${json.code} msg=${json.message}`)
      return { error: json.message || `TikTok code=${json.code}` }
    }
    const list = json.data?.list ?? []
    all.push(...list)

    const pageInfo = json.data?.page_info
    if (!pageInfo || pageInfo.page >= pageInfo.total_page || all.length >= 5000) break
    page += 1
  }

  return { rows: all }
}

export interface TiktokAdvertiser {
  advertiser_id: string
  advertiser_name: string
  status?: string
}

export async function listTiktokAdvertisers(): Promise<
  { advertisers: TiktokAdvertiser[] } | { error: string }
> {
  const creds = await getTiktokCredentials()
  if (!creds) return { error: "TikTok credentials missing" }

  const url = new URL(`${TIKTOK_API}/oauth2/advertiser/get/`)
  url.searchParams.set("app_id", creds.app_id)
  url.searchParams.set("secret", creds.secret)

  const res = await fetch(url.toString(), {
    headers: { "Access-Token": creds.access_token },
    cache: "no-store",
  })
  if (!res.ok) return { error: `TikTok API HTTP ${res.status}` }

  const json = (await res.json()) as TiktokApiResponse<{ list?: TiktokAdvertiser[] }>
  if (json.code !== 0) {
    console.error(`[tiktok] advertiser list error: code=${json.code} msg=${json.message}`)
    return { error: json.message || `TikTok code=${json.code}` }
  }

  return { advertisers: json.data?.list ?? [] }
}
