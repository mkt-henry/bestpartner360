import { getGa4Credentials } from "@/lib/credentials"

const GA4_DATA_API = "https://analyticsdata.googleapis.com/v1beta"

export type Ga4Row = {
  dimensions: string[]
  metrics: string[]
}

export async function runGa4Report(params: {
  propertyId: string
  startDate: string
  endDate: string
  dimensions: string[]
  metrics: string[]
  orderByMetric?: string
  limit?: number
}): Promise<{ rows: Ga4Row[] } | { error: string }> {
  const creds = await getGa4Credentials()
  if (!creds) return { error: "GA4 credentials missing" }

  const body = {
    dateRanges: [{ startDate: params.startDate, endDate: params.endDate }],
    dimensions: params.dimensions.map((name) => ({ name })),
    metrics: params.metrics.map((name) => ({ name })),
    orderBys: params.orderByMetric
      ? [{ metric: { metricName: params.orderByMetric }, desc: true }]
      : undefined,
    limit: params.limit ?? 100,
  }

  try {
    const res = await fetch(`${GA4_DATA_API}/properties/${params.propertyId}:runReport`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      return { error: err?.error?.message ?? `GA4 HTTP ${res.status}` }
    }
    const json = (await res.json()) as {
      rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[]
    }
    const rows: Ga4Row[] = (json.rows ?? []).map((row) => ({
      dimensions: row.dimensionValues.map((d) => d.value),
      metrics: row.metricValues.map((m) => m.value),
    }))
    return { rows }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "unknown" }
  }
}

export async function runGa4Realtime(params: {
  propertyId: string
  dimensions: string[]
  metrics: string[]
  limit?: number
}): Promise<{ rows: Ga4Row[] } | { error: string }> {
  const creds = await getGa4Credentials()
  if (!creds) return { error: "GA4 credentials missing" }

  const body = {
    dimensions: params.dimensions.map((name) => ({ name })),
    metrics: params.metrics.map((name) => ({ name })),
    limit: params.limit ?? 50,
  }

  try {
    const res = await fetch(`${GA4_DATA_API}/properties/${params.propertyId}:runRealtimeReport`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      return { error: err?.error?.message ?? `GA4 Realtime HTTP ${res.status}` }
    }
    const json = (await res.json()) as {
      rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[]
    }
    const rows: Ga4Row[] = (json.rows ?? []).map((row) => ({
      dimensions: row.dimensionValues.map((d) => d.value),
      metrics: row.metricValues.map((m) => m.value),
    }))
    return { rows }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "unknown" }
  }
}
