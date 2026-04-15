import { getKlaviyoCredentials } from "@/lib/credentials"

const KLAVIYO_API = "https://a.klaviyo.com/api"
const REVISION = "2024-10-15"

type KlaviyoHeaders = Record<string, string>

function authHeaders(apiKey: string): KlaviyoHeaders {
  return {
    Authorization: `Klaviyo-API-Key ${apiKey}`,
    revision: REVISION,
    accept: "application/json",
    "content-type": "application/json",
  }
}

export type KlaviyoCampaign = {
  id: string
  name: string
  status: string
  sendTime: string | null
  channel: string
}

export type KlaviyoFlow = {
  id: string
  name: string
  status: string
  triggerType: string | null
  created: string | null
}

export type KlaviyoList = {
  id: string
  name: string
  profileCount: number
}

export type KlaviyoCampaignMetrics = {
  campaignId: string
  recipients: number
  opens: number
  openRate: number
  clicks: number
  clickRate: number
  conversions: number
  revenue: number
}

export type KlaviyoFlowMetrics = {
  flowId: string
  recipients: number
  opens: number
  openRate: number
  clicks: number
  clickRate: number
  conversions: number
  revenue: number
}

export type KlaviyoOverview = {
  totalSubscribers: number
  lists: KlaviyoList[]
  campaigns: KlaviyoCampaign[]
  flows: KlaviyoFlow[]
  campaignMetrics: KlaviyoCampaignMetrics[]
  flowMetrics: KlaviyoFlowMetrics[]
}

async function get<T>(path: string, apiKey: string): Promise<T | { error: string }> {
  try {
    const res = await fetch(`${KLAVIYO_API}${path}`, {
      headers: authHeaders(apiKey),
      cache: "no-store",
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as
        | { errors?: { detail?: string }[] }
        | null
      return { error: err?.errors?.[0]?.detail ?? `Klaviyo HTTP ${res.status}` }
    }
    return (await res.json()) as T
  } catch (err) {
    return { error: err instanceof Error ? err.message : "unknown" }
  }
}

async function post<T>(path: string, apiKey: string, body: unknown): Promise<T | { error: string }> {
  try {
    const res = await fetch(`${KLAVIYO_API}${path}`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify(body),
      cache: "no-store",
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as
        | { errors?: { detail?: string }[] }
        | null
      return { error: err?.errors?.[0]?.detail ?? `Klaviyo HTTP ${res.status}` }
    }
    return (await res.json()) as T
  } catch (err) {
    return { error: err instanceof Error ? err.message : "unknown" }
  }
}

type KlaviyoListResponse = {
  data: {
    id: string
    attributes: Record<string, unknown> & { profile_count?: number }
  }[]
}

export async function fetchKlaviyoOverview(): Promise<KlaviyoOverview | { error: string }> {
  const creds = await getKlaviyoCredentials()
  if (!creds) return { error: "Klaviyo credentials missing" }

  const [listsRaw, campaignsRaw, flowsRaw] = await Promise.all([
    get<KlaviyoListResponse>("/lists?fields[list]=name,profile_count&page[size]=50", creds.api_key),
    get<KlaviyoListResponse>(
      '/campaigns?filter=equals(messages.channel,"email")&fields[campaign]=name,status,send_time,send_strategy&page[size]=20&sort=-send_time',
      creds.api_key
    ),
    get<KlaviyoListResponse>(
      "/flows?fields[flow]=name,status,trigger_type,created&page[size]=50",
      creds.api_key
    ),
  ])

  if ("error" in listsRaw) return { error: `lists: ${listsRaw.error}` }
  if ("error" in campaignsRaw) return { error: `campaigns: ${campaignsRaw.error}` }
  if ("error" in flowsRaw) return { error: `flows: ${flowsRaw.error}` }

  const lists: KlaviyoList[] = listsRaw.data.map((d) => ({
    id: d.id,
    name: (d.attributes.name as string) ?? "—",
    profileCount: Number(d.attributes.profile_count ?? 0),
  }))
  const totalSubscribers = lists.reduce((s, l) => s + l.profileCount, 0)

  const campaigns: KlaviyoCampaign[] = campaignsRaw.data.map((d) => ({
    id: d.id,
    name: (d.attributes.name as string) ?? "—",
    status: (d.attributes.status as string) ?? "—",
    sendTime: (d.attributes.send_time as string) ?? null,
    channel: "email",
  }))

  const flows: KlaviyoFlow[] = flowsRaw.data.map((d) => ({
    id: d.id,
    name: (d.attributes.name as string) ?? "—",
    status: (d.attributes.status as string) ?? "—",
    triggerType: (d.attributes.trigger_type as string) ?? null,
    created: (d.attributes.created as string) ?? null,
  }))

  // Optional: campaign + flow metrics via reporting endpoint. Klaviyo requires
  // a statistics list; fallback to empty arrays on error so the page still renders.
  const campaignMetrics = await fetchCampaignMetrics(creds.api_key, campaigns.map((c) => c.id))
  const flowMetrics = await fetchFlowMetrics(creds.api_key, flows.map((f) => f.id))

  return {
    totalSubscribers,
    lists,
    campaigns,
    flows,
    campaignMetrics,
    flowMetrics,
  }
}

type ReportResponse = {
  data: {
    attributes: {
      results: {
        groupings: Record<string, string>
        statistics: Record<string, number>
      }[]
    }
  }
}

const STATISTICS = [
  "recipients",
  "opens",
  "open_rate",
  "clicks",
  "click_rate",
  "conversions",
  "conversion_value",
]

async function fetchCampaignMetrics(
  apiKey: string,
  campaignIds: string[]
): Promise<KlaviyoCampaignMetrics[]> {
  if (campaignIds.length === 0) return []
  const body = {
    data: {
      type: "campaign-values-report",
      attributes: {
        statistics: STATISTICS,
        timeframe: { key: "last_30_days" },
        conversion_metric_id: null,
        filter: `any(campaign_id,[${campaignIds.map((id) => `"${id}"`).join(",")}])`,
      },
    },
  }
  const res = await post<ReportResponse>("/campaign-values-reports", apiKey, body)
  if ("error" in res) return []
  return res.data.attributes.results.map((r) => ({
    campaignId: r.groupings.campaign_id ?? "",
    recipients: Number(r.statistics.recipients ?? 0),
    opens: Number(r.statistics.opens ?? 0),
    openRate: Number(r.statistics.open_rate ?? 0),
    clicks: Number(r.statistics.clicks ?? 0),
    clickRate: Number(r.statistics.click_rate ?? 0),
    conversions: Number(r.statistics.conversions ?? 0),
    revenue: Number(r.statistics.conversion_value ?? 0),
  }))
}

async function fetchFlowMetrics(
  apiKey: string,
  flowIds: string[]
): Promise<KlaviyoFlowMetrics[]> {
  if (flowIds.length === 0) return []
  const body = {
    data: {
      type: "flow-values-report",
      attributes: {
        statistics: STATISTICS,
        timeframe: { key: "last_30_days" },
        conversion_metric_id: null,
        filter: `any(flow_id,[${flowIds.map((id) => `"${id}"`).join(",")}])`,
      },
    },
  }
  const res = await post<ReportResponse>("/flow-values-reports", apiKey, body)
  if ("error" in res) return []
  return res.data.attributes.results.map((r) => ({
    flowId: r.groupings.flow_id ?? "",
    recipients: Number(r.statistics.recipients ?? 0),
    opens: Number(r.statistics.opens ?? 0),
    openRate: Number(r.statistics.open_rate ?? 0),
    clicks: Number(r.statistics.clicks ?? 0),
    clickRate: Number(r.statistics.click_rate ?? 0),
    conversions: Number(r.statistics.conversions ?? 0),
    revenue: Number(r.statistics.conversion_value ?? 0),
  }))
}
