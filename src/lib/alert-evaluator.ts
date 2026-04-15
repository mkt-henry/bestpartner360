import { createAdminClient } from "@/lib/supabase/admin"

type AlertRule = {
  id: string
  brand_id: string
  name: string
  metric: string
  operator: string
  threshold: number
  scope: Record<string, unknown>
  is_active: boolean
}

type EvalResult = {
  rule_id: string
  brand_id: string
  fired: boolean
  current_value: number
  title: string
  message: string
  severity: "crit" | "warn" | "info"
}

function compare(cur: number, op: string, threshold: number): boolean {
  switch (op) {
    case ">":
      return cur > threshold
    case ">=":
      return cur >= threshold
    case "<":
      return cur < threshold
    case "<=":
      return cur <= threshold
    case "==":
      return cur === threshold
    case "!=":
      return cur !== threshold
    default:
      return false
  }
}

function daysAgoISO(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

type Sb = ReturnType<typeof createAdminClient>

async function evalSpendPacing(rule: AlertRule, sb: Sb): Promise<EvalResult> {
  // Current month spend vs budget pacing %
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd = today.toISOString().slice(0, 10)

  const { data: campaigns } = await sb
    .from("campaigns")
    .select("id")
    .eq("brand_id", rule.brand_id)
  const ids = (campaigns ?? []).map((c: { id: string }) => c.id)
  if (ids.length === 0) {
    return zero(rule, "Spend pacing: no campaigns")
  }

  const [{ data: spend }, { data: budgets }] = await Promise.all([
    sb
      .from("spend_records")
      .select("amount")
      .in("campaign_id", ids)
      .gte("spend_date", monthStart)
      .lte("spend_date", monthEnd),
    sb
      .from("budgets")
      .select("total_budget")
      .in("campaign_id", ids)
      .lte("period_start", monthEnd)
      .gte("period_end", monthStart),
  ])

  const spendTotal = (spend ?? []).reduce((s, r: { amount: number }) => s + Number(r.amount), 0)
  const budgetTotal = (budgets ?? []).reduce(
    (s, r: { total_budget: number }) => s + Number(r.total_budget),
    0
  )
  if (budgetTotal <= 0) return zero(rule, "Spend pacing: no budget set")

  // Day-of-month pacing: expected = (days_elapsed/days_in_month) * budget
  const dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const expectedPct = (today.getDate() / dim) * 100
  const actualPct = (spendTotal / budgetTotal) * 100
  const pacingPct = expectedPct > 0 ? (actualPct / expectedPct) * 100 : 0

  const fired = compare(pacingPct, rule.operator, rule.threshold)
  return {
    rule_id: rule.id,
    brand_id: rule.brand_id,
    fired,
    current_value: pacingPct,
    title: `Spend pacing at ${pacingPct.toFixed(0)}% of expected`,
    message: `Month-to-date spend ₩${Math.round(spendTotal).toLocaleString("ko-KR")} of budget ₩${Math.round(budgetTotal).toLocaleString("ko-KR")} · expected ${expectedPct.toFixed(0)}%`,
    severity: pacingPct >= 150 ? "crit" : "warn",
  }
}

async function evalRoas(rule: AlertRule, sb: Sb): Promise<EvalResult> {
  // Last 24h ROAS
  const since = daysAgoISO(1)
  const until = daysAgoISO(0)

  const { data: campaigns } = await sb
    .from("campaigns")
    .select("id")
    .eq("brand_id", rule.brand_id)
  const ids = (campaigns ?? []).map((c: { id: string }) => c.id)

  const { data: utmEntries } = await sb
    .from("ga4_utm_entries")
    .select("id")
    .eq("brand_id", rule.brand_id)
  const utmIds = (utmEntries ?? []).map((e: { id: string }) => e.id)

  const [{ data: spend }, { data: perf }] = await Promise.all([
    ids.length > 0
      ? sb
          .from("spend_records")
          .select("amount")
          .in("campaign_id", ids)
          .gte("spend_date", since)
          .lte("spend_date", until)
      : Promise.resolve({ data: [] }),
    utmIds.length > 0
      ? sb
          .from("ga4_utm_performance")
          .select("revenue")
          .in("utm_entry_id", utmIds)
          .gte("record_date", since)
          .lte("record_date", until)
      : Promise.resolve({ data: [] }),
  ])

  const spendTotal = (spend ?? []).reduce((s, r: { amount: number }) => s + Number(r.amount), 0)
  const revenueTotal = (perf ?? []).reduce(
    (s, r: { revenue: number }) => s + Number(r.revenue ?? 0),
    0
  )
  if (spendTotal <= 0) return zero(rule, "ROAS: no spend in last 24h")

  const roas = revenueTotal / spendTotal
  const fired = compare(roas, rule.operator, rule.threshold)
  return {
    rule_id: rule.id,
    brand_id: rule.brand_id,
    fired,
    current_value: roas,
    title: `ROAS at ${roas.toFixed(2)}× (24h)`,
    message: `Revenue ₩${Math.round(revenueTotal).toLocaleString("ko-KR")} on spend ₩${Math.round(spendTotal).toLocaleString("ko-KR")}`,
    severity: roas < 1 ? "crit" : "warn",
  }
}

async function evalCac(rule: AlertRule, sb: Sb): Promise<EvalResult> {
  const since = daysAgoISO(1)
  const until = daysAgoISO(0)

  const { data: campaigns } = await sb
    .from("campaigns")
    .select("id")
    .eq("brand_id", rule.brand_id)
  const ids = (campaigns ?? []).map((c: { id: string }) => c.id)

  const { data: utmEntries } = await sb
    .from("ga4_utm_entries")
    .select("id")
    .eq("brand_id", rule.brand_id)
  const utmIds = (utmEntries ?? []).map((e: { id: string }) => e.id)

  const [{ data: spend }, { data: perf }] = await Promise.all([
    ids.length > 0
      ? sb
          .from("spend_records")
          .select("amount")
          .in("campaign_id", ids)
          .gte("spend_date", since)
          .lte("spend_date", until)
      : Promise.resolve({ data: [] }),
    utmIds.length > 0
      ? sb
          .from("ga4_utm_performance")
          .select("conversions")
          .in("utm_entry_id", utmIds)
          .gte("record_date", since)
          .lte("record_date", until)
      : Promise.resolve({ data: [] }),
  ])

  const spendTotal = (spend ?? []).reduce((s, r: { amount: number }) => s + Number(r.amount), 0)
  const conv = (perf ?? []).reduce(
    (s, r: { conversions: number }) => s + Number(r.conversions ?? 0),
    0
  )
  if (conv <= 0) return zero(rule, "CAC: no conversions in last 24h")

  const cac = spendTotal / conv
  const fired = compare(cac, rule.operator, rule.threshold)
  return {
    rule_id: rule.id,
    brand_id: rule.brand_id,
    fired,
    current_value: cac,
    title: `CAC at ₩${Math.round(cac).toLocaleString("ko-KR")} (24h)`,
    message: `${conv} conversions on spend ₩${Math.round(spendTotal).toLocaleString("ko-KR")}`,
    severity: "warn",
  }
}

async function evalCtr(rule: AlertRule, sb: Sb): Promise<EvalResult> {
  const since = daysAgoISO(1)
  const until = daysAgoISO(0)

  const { data: campaigns } = await sb
    .from("campaigns")
    .select("id")
    .eq("brand_id", rule.brand_id)
  const ids = (campaigns ?? []).map((c: { id: string }) => c.id)
  if (ids.length === 0) return zero(rule, "CTR: no campaigns")

  const { data: perf } = await sb
    .from("performance_records")
    .select("values")
    .in("campaign_id", ids)
    .gte("record_date", since)
    .lte("record_date", until)

  const totals = (perf ?? []).reduce(
    (acc, r: { values: Record<string, number> }) => {
      acc.impressions += Number(r.values?.impressions ?? 0)
      acc.clicks += Number(r.values?.clicks ?? 0)
      return acc
    },
    { impressions: 0, clicks: 0 }
  )
  if (totals.impressions <= 0) return zero(rule, "CTR: no impressions")

  const ctr = (totals.clicks / totals.impressions) * 100
  const fired = compare(ctr, rule.operator, rule.threshold)
  return {
    rule_id: rule.id,
    brand_id: rule.brand_id,
    fired,
    current_value: ctr,
    title: `CTR at ${ctr.toFixed(2)}% (24h)`,
    message: `${totals.clicks} clicks on ${totals.impressions} impressions`,
    severity: "info",
  }
}

function zero(rule: AlertRule, why: string): EvalResult {
  return {
    rule_id: rule.id,
    brand_id: rule.brand_id,
    fired: false,
    current_value: 0,
    title: rule.name,
    message: why,
    severity: "info",
  }
}

export async function evaluateAlerts(): Promise<{
  checked: number
  fired: number
  skipped: number
  results: EvalResult[]
}> {
  const sb = createAdminClient()

  const { data: rules, error } = await sb
    .from("alert_rules")
    .select("id, brand_id, name, metric, operator, threshold, scope, is_active")
    .eq("is_active", true)
  if (error) {
    if (error.code === "42P01") return { checked: 0, fired: 0, skipped: 0, results: [] }
    throw error
  }

  const activeRules = (rules ?? []) as AlertRule[]
  const results: EvalResult[] = []
  let skipped = 0

  for (const rule of activeRules) {
    let r: EvalResult
    try {
      switch (rule.metric) {
        case "spend_pacing":
          r = await evalSpendPacing(rule, sb)
          break
        case "roas":
          r = await evalRoas(rule, sb)
          break
        case "cac":
          r = await evalCac(rule, sb)
          break
        case "ctr":
          r = await evalCtr(rule, sb)
          break
        default:
          skipped++
          continue
      }
      results.push(r)
    } catch {
      skipped++
    }
  }

  // Dedupe: skip insert if an open event for same rule exists within last 60 minutes
  const firedResults = results.filter((r) => r.fired)
  if (firedResults.length === 0) {
    return { checked: activeRules.length, fired: 0, skipped, results }
  }

  const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: recentOpen } = await sb
    .from("alert_events")
    .select("rule_id")
    .eq("status", "open")
    .gte("fired_at", sinceIso)
  const recentRuleIds = new Set(
    (recentOpen ?? []).map((e: { rule_id: string }) => e.rule_id)
  )

  const toInsert = firedResults
    .filter((r) => !recentRuleIds.has(r.rule_id))
    .map((r) => ({
      rule_id: r.rule_id,
      brand_id: r.brand_id,
      severity: r.severity,
      title: r.title,
      message: r.message,
      payload: { current_value: r.current_value },
      status: "open",
    }))

  if (toInsert.length > 0) {
    await sb.from("alert_events").insert(toInsert)
  }

  return { checked: activeRules.length, fired: firedResults.length, skipped, results }
}
