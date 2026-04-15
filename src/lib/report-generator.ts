import { createAdminClient } from "@/lib/supabase/admin"

type Sb = ReturnType<typeof createAdminClient>

export type ReportConfig = {
  dataset?: "campaign_summary" | "spend_by_day" | "performance_by_day"
  days?: number
}

function daysAgoISO(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v)
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const head = headers.map(csvEscape).join(",")
  const body = rows.map((r) => r.map(csvEscape).join(",")).join("\n")
  return `${head}\n${body}\n`
}

async function genCampaignSummary(sb: Sb, brandId: string, days: number): Promise<string> {
  const since = daysAgoISO(days)
  const until = todayISO()

  const { data: campaigns } = await sb
    .from("campaigns")
    .select("id, name, channel, status")
    .eq("brand_id", brandId)

  const camps = (campaigns ?? []) as {
    id: string
    name: string
    channel: string
    status: string
  }[]
  if (camps.length === 0) {
    return toCsv(["campaign", "channel", "status", "spend", "impressions", "clicks", "ctr"], [])
  }

  const ids = camps.map((c) => c.id)
  const [{ data: spend }, { data: perf }] = await Promise.all([
    sb
      .from("spend_records")
      .select("campaign_id, amount")
      .in("campaign_id", ids)
      .gte("spend_date", since)
      .lte("spend_date", until),
    sb
      .from("performance_records")
      .select("campaign_id, values")
      .in("campaign_id", ids)
      .gte("record_date", since)
      .lte("record_date", until),
  ])

  const spendBy = new Map<string, number>()
  for (const s of (spend ?? []) as { campaign_id: string; amount: number }[]) {
    spendBy.set(s.campaign_id, (spendBy.get(s.campaign_id) ?? 0) + Number(s.amount))
  }
  const perfBy = new Map<string, { impressions: number; clicks: number }>()
  for (const p of (perf ?? []) as {
    campaign_id: string
    values: Record<string, number>
  }[]) {
    const cur = perfBy.get(p.campaign_id) ?? { impressions: 0, clicks: 0 }
    cur.impressions += Number(p.values?.impressions ?? 0)
    cur.clicks += Number(p.values?.clicks ?? 0)
    perfBy.set(p.campaign_id, cur)
  }

  const rows = camps.map((c) => {
    const sp = spendBy.get(c.id) ?? 0
    const pf = perfBy.get(c.id) ?? { impressions: 0, clicks: 0 }
    const ctr = pf.impressions > 0 ? (pf.clicks / pf.impressions) * 100 : 0
    return [
      c.name,
      c.channel,
      c.status,
      sp.toFixed(2),
      pf.impressions,
      pf.clicks,
      ctr.toFixed(2),
    ] as (string | number)[]
  })

  return toCsv(
    ["campaign", "channel", "status", "spend", "impressions", "clicks", "ctr_pct"],
    rows
  )
}

async function genSpendByDay(sb: Sb, brandId: string, days: number): Promise<string> {
  const since = daysAgoISO(days)
  const until = todayISO()

  const { data: campaigns } = await sb
    .from("campaigns")
    .select("id, name, channel")
    .eq("brand_id", brandId)
  const camps = (campaigns ?? []) as { id: string; name: string; channel: string }[]
  const nameById = new Map(camps.map((c) => [c.id, c]))

  if (camps.length === 0) {
    return toCsv(["date", "campaign", "channel", "amount"], [])
  }

  const { data } = await sb
    .from("spend_records")
    .select("campaign_id, spend_date, amount")
    .in(
      "campaign_id",
      camps.map((c) => c.id)
    )
    .gte("spend_date", since)
    .lte("spend_date", until)
    .order("spend_date", { ascending: true })

  const rows = ((data ?? []) as { campaign_id: string; spend_date: string; amount: number }[]).map(
    (r) => {
      const c = nameById.get(r.campaign_id)
      return [r.spend_date, c?.name ?? r.campaign_id, c?.channel ?? "", Number(r.amount).toFixed(2)]
    }
  )

  return toCsv(["date", "campaign", "channel", "amount"], rows)
}

async function genPerformanceByDay(sb: Sb, brandId: string, days: number): Promise<string> {
  const since = daysAgoISO(days)
  const until = todayISO()

  const { data: campaigns } = await sb
    .from("campaigns")
    .select("id, name")
    .eq("brand_id", brandId)
  const camps = (campaigns ?? []) as { id: string; name: string }[]
  const nameById = new Map(camps.map((c) => [c.id, c.name]))

  if (camps.length === 0) {
    return toCsv(["date", "campaign", "impressions", "clicks", "ctr_pct"], [])
  }

  const { data } = await sb
    .from("performance_records")
    .select("campaign_id, record_date, values")
    .in(
      "campaign_id",
      camps.map((c) => c.id)
    )
    .gte("record_date", since)
    .lte("record_date", until)
    .order("record_date", { ascending: true })

  const rows = (
    (data ?? []) as {
      campaign_id: string
      record_date: string
      values: Record<string, number>
    }[]
  ).map((r) => {
    const impressions = Number(r.values?.impressions ?? 0)
    const clicks = Number(r.values?.clicks ?? 0)
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    return [
      r.record_date,
      nameById.get(r.campaign_id) ?? r.campaign_id,
      impressions,
      clicks,
      ctr.toFixed(2),
    ]
  })

  return toCsv(["date", "campaign", "impressions", "clicks", "ctr_pct"], rows)
}

export async function generateReportCsv(
  brandId: string,
  config: ReportConfig
): Promise<{ csv: string; filename: string }> {
  const sb = createAdminClient()
  const dataset = config.dataset ?? "campaign_summary"
  const days = Math.max(1, Math.min(365, Number(config.days ?? 30)))
  const stamp = todayISO()

  let csv: string
  switch (dataset) {
    case "spend_by_day":
      csv = await genSpendByDay(sb, brandId, days)
      break
    case "performance_by_day":
      csv = await genPerformanceByDay(sb, brandId, days)
      break
    case "campaign_summary":
    default:
      csv = await genCampaignSummary(sb, brandId, days)
      break
  }

  return { csv, filename: `${dataset}_${days}d_${stamp}.csv` }
}
