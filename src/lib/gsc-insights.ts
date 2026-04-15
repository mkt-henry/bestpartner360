import { getGa4Credentials } from "@/lib/credentials"

const SC_API = "https://searchconsole.googleapis.com/webmasters/v3"

export type GscRow = {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export type GscSite = {
  siteUrl: string
  permissionLevel: string
}

export async function fetchGscSites(): Promise<{ sites: GscSite[] } | { error: string }> {
  const creds = await getGa4Credentials()
  if (!creds) return { error: "Google credentials missing" }

  try {
    const res = await fetch(`${SC_API}/sites`, {
      headers: { Authorization: `Bearer ${creds.access_token}` },
      cache: "no-store",
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      return { error: err?.error?.message ?? `GSC HTTP ${res.status}` }
    }
    const json = (await res.json()) as {
      siteEntry?: { siteUrl: string; permissionLevel: string }[]
    }
    return { sites: json.siteEntry ?? [] }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "unknown" }
  }
}

export async function fetchGscPerformance(params: {
  siteUrl: string
  startDate: string
  endDate: string
  dimensions?: string[]
  rowLimit?: number
  searchType?: "web" | "image" | "video" | "news"
}): Promise<{ rows: GscRow[] } | { error: string }> {
  const creds = await getGa4Credentials()
  if (!creds) return { error: "Google credentials missing" }

  const body = {
    startDate: params.startDate,
    endDate: params.endDate,
    dimensions: params.dimensions ?? [],
    rowLimit: params.rowLimit ?? 100,
    searchType: params.searchType ?? "web",
  }

  try {
    const res = await fetch(
      `${SC_API}/sites/${encodeURIComponent(params.siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    )
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      return { error: err?.error?.message ?? `GSC HTTP ${res.status}` }
    }
    const json = (await res.json()) as {
      rows?: { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number }[]
    }
    const rows: GscRow[] = (json.rows ?? []).map((r) => ({
      keys: r.keys ?? [],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }))
    return { rows }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "unknown" }
  }
}
