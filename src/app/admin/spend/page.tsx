export const dynamic = "force-dynamic"

import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import MetaSpendSyncButton from "./MetaSpendSyncButton"

type SearchParams = {
  from?: string
  to?: string
  range?: string
}

type BrandRow = {
  id: string
  name: string
}

type CampaignRow = {
  id: string
  brand_id: string
  name: string
  channel: string
  status: "active" | "paused" | "ended"
  start_date: string
  end_date: string | null
  platform: string | null
}

type BudgetRow = {
  campaign_id: string
  period_start: string
  period_end: string
  total_budget: number | string
}

type SpendRow = {
  campaign_id: string
  spend_date: string
  amount: number | string
}

type MetaAccountRow = {
  brand_id: string
  meta_account_id: string
}

type SyncRunRow = {
  brand_id: string
  account_ref: string
  status: "running" | "success" | "partial" | "failed"
  started_at: string
  finished_at: string | null
  error_message: string | null
}

type MediaSummary = {
  campaign: CampaignRow
  spend: number
  budget: number
  remaining: number
  percent: number
  spendRecordCount: number
}

type BrandSummary = {
  brand: BrandRow
  media: MediaSummary[]
  spend: number
  budget: number
  remaining: number
  percent: number
  metaAccountCount: number
  latestMetaSync: SyncRunRow | null
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

function toDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function currentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    from: toDateInput(start),
    to: toDateInput(now),
  }
}

function presetRange(range?: string) {
  const now = new Date()

  if (range === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return {
      from: toDateInput(start),
      to: toDateInput(end),
    }
  }

  if (range === "this_month") return currentMonthRange()

  return null
}

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0.0%"
  return `${value.toFixed(1)}%`
}

function pct(spend: number, budget: number) {
  return budget > 0 ? (spend / budget) * 100 : 0
}

function barColor(percent: number) {
  if (percent >= 100) return "var(--bad)"
  if (percent >= 80) return "var(--amber)"
  return "var(--good)"
}

function spendState(row: MediaSummary) {
  if (row.spendRecordCount === 0) return { label: "소진 기록 없음", className: "tag neutral" }
  if (row.budget > 0 && row.spend > row.budget) return { label: "예산 초과", className: "tag bad" }
  if (row.percent >= 80) return { label: "소진 주의", className: "tag warn" }
  return { label: "정상", className: "tag good" }
}

function statusLabel(status: CampaignRow["status"]) {
  if (status === "active") return "진행중"
  if (status === "paused") return "일시중지"
  return "종료"
}

function statusClass(status: CampaignRow["status"]) {
  if (status === "active") return "tag good"
  if (status === "paused") return "tag warn"
  return "tag neutral"
}

function formatDateTime(value: string | null) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value))
}

function syncMessage(sync: SyncRunRow | null) {
  if (!sync) return "아직 Meta 소진 동기화 기록이 없습니다."
  if (sync.status === "success") return `최근 Meta 동기화 성공: ${formatDateTime(sync.finished_at ?? sync.started_at)}`
  if (sync.status === "running") return `Meta 동기화 진행 중: ${formatDateTime(sync.started_at)}`
  const tokenRejected = sync.error_message?.toLowerCase().includes("access token") || sync.error_message?.toLowerCase().includes("session has expired")
  if (tokenRejected) return `최근 Meta 동기화 실패: 저장된 토큰을 Meta API가 거부함 (${formatDateTime(sync.finished_at ?? sync.started_at)})`
  return `최근 Meta 동기화 실패: ${sync.error_message ?? "오류 내용 없음"}`
}

function syncTone(sync: SyncRunRow | null) {
  if (!sync) return "var(--dim)"
  if (sync.status === "success") return "var(--good)"
  if (sync.status === "running") return "var(--amber)"
  return "var(--bad)"
}

export default async function AdminSpendPage({ searchParams }: PageProps) {
  const params = await searchParams
  const selectedRange = params.range || ""
  const range = presetRange(selectedRange) ?? currentMonthRange()
  const from = params.range ? range.from : params.from || range.from
  const to = params.range ? range.to : params.to || range.to
  const isDefaultThisMonth = !selectedRange && !params.from && !params.to

  const supabase = await createClient()

  const [{ data: brands }, { data: campaigns }] = await Promise.all([
    supabase.from("brands").select("id, name").order("name"),
    supabase
      .from("campaigns")
      .select("id, brand_id, name, channel, status, start_date, end_date, platform")
      .order("created_at", { ascending: false }),
  ])

  const brandList = (brands ?? []) as BrandRow[]
  const campaignList = ((campaigns ?? []) as CampaignRow[]).filter((campaign) => !campaign.platform)
  const campaignIds = campaignList.map((campaign) => campaign.id)
  const brandIds = brandList.map((brand) => brand.id)
  const adminSupabase = createAdminClient()

  const [{ data: spendRecords }, { data: budgets }] =
    campaignIds.length > 0
      ? await Promise.all([
          supabase
            .from("spend_records")
            .select("campaign_id, spend_date, amount")
            .in("campaign_id", campaignIds)
            .gte("spend_date", from)
            .lte("spend_date", to),
          supabase
            .from("budgets")
            .select("campaign_id, period_start, period_end, total_budget")
            .in("campaign_id", campaignIds)
            .lte("period_start", to)
            .gte("period_end", from),
        ])
      : [{ data: [] }, { data: [] }]

  const [{ data: metaAccounts }, { data: metaSyncRuns }] =
    brandIds.length > 0
      ? await Promise.all([
          adminSupabase.from("meta_ad_accounts").select("brand_id, meta_account_id").in("brand_id", brandIds),
          adminSupabase
            .from("sync_runs")
            .select("brand_id, account_ref, status, started_at, finished_at, error_message")
            .eq("platform", "meta")
            .in("brand_id", brandIds)
            .order("started_at", { ascending: false })
            .limit(200),
        ])
      : [{ data: [] }, { data: [] }]

  const spendList = (spendRecords ?? []) as SpendRow[]
  const budgetList = (budgets ?? []) as BudgetRow[]
  const metaAccountList = (metaAccounts ?? []) as MetaAccountRow[]
  const metaSyncList = (metaSyncRuns ?? []) as SyncRunRow[]

  const spendByCampaign = new Map<string, number>()
  const spendCountByCampaign = new Map<string, number>()
  for (const record of spendList) {
    spendByCampaign.set(
      record.campaign_id,
      (spendByCampaign.get(record.campaign_id) ?? 0) + Number(record.amount)
    )
    spendCountByCampaign.set(record.campaign_id, (spendCountByCampaign.get(record.campaign_id) ?? 0) + 1)
  }

  const budgetByCampaign = new Map<string, number>()
  for (const budget of budgetList) {
    budgetByCampaign.set(
      budget.campaign_id,
      (budgetByCampaign.get(budget.campaign_id) ?? 0) + Number(budget.total_budget)
    )
  }

  const metaAccountCountByBrand = new Map<string, number>()
  for (const account of metaAccountList) {
    metaAccountCountByBrand.set(account.brand_id, (metaAccountCountByBrand.get(account.brand_id) ?? 0) + 1)
  }

  const latestMetaSyncByBrand = new Map<string, SyncRunRow>()
  for (const sync of metaSyncList) {
    if (!latestMetaSyncByBrand.has(sync.brand_id)) latestMetaSyncByBrand.set(sync.brand_id, sync)
  }

  const brandSummaries: BrandSummary[] = brandList.map((brand) => {
    const media = campaignList
      .filter((campaign) => campaign.brand_id === brand.id)
      .map((campaign) => {
        const spend = spendByCampaign.get(campaign.id) ?? 0
        const budget = budgetByCampaign.get(campaign.id) ?? 0
        return {
          campaign,
          spend,
          budget,
          remaining: budget - spend,
          percent: pct(spend, budget),
          spendRecordCount: spendCountByCampaign.get(campaign.id) ?? 0,
        }
      })
      .sort((a, b) => b.percent - a.percent || b.spend - a.spend)

    const spend = media.reduce((sum, row) => sum + row.spend, 0)
    const budget = media.reduce((sum, row) => sum + row.budget, 0)

    return {
      brand,
      media,
      spend,
      budget,
      remaining: budget - spend,
      percent: pct(spend, budget),
      metaAccountCount: metaAccountCountByBrand.get(brand.id) ?? 0,
      latestMetaSync: latestMetaSyncByBrand.get(brand.id) ?? null,
    }
  })

  const totalBudget = brandSummaries.reduce((sum, summary) => sum + summary.budget, 0)
  const totalSpend = brandSummaries.reduce((sum, summary) => sum + summary.spend, 0)
  const totalRemaining = totalBudget - totalSpend
  const totalPercent = pct(totalSpend, totalBudget)
  const activeMediaCount = campaignList.length
  const overspentMediaCount = brandSummaries.reduce(
    (count, brand) => count + brand.media.filter((row) => row.budget > 0 && row.spend > row.budget).length,
    0
  )
  const metaBrandIds = brandSummaries
    .filter((summary) => summary.metaAccountCount > 0)
    .map((summary) => summary.brand.id)

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1>
            예산 <em>소진 현황</em>
          </h1>
          <p className="sub">각 브랜드의 매체별 예산 소진율을 한 화면에서 확인합니다.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Link
          href="/admin/spend?range=this_month"
          className={selectedRange === "this_month" || isDefaultThisMonth ? "chip on" : "chip"}
        >
          당월
        </Link>
        <Link
          href="/admin/spend?range=last_month"
          className={selectedRange === "last_month" ? "chip on" : "chip"}
        >
          전월
        </Link>
      </div>

      <form
        action="/admin/spend"
        style={{ display: "flex", alignItems: "end", gap: 10, flexWrap: "wrap", marginBottom: 16 }}
      >
        <div>
          <label className="form-label">시작일</label>
          <input className="form-input" type="date" name="from" defaultValue={from} />
        </div>
        <div>
          <label className="form-label">종료일</label>
          <input className="form-input" type="date" name="to" defaultValue={to} />
        </div>
        <button type="submit" className="btn primary">
          조회
        </button>
        {metaBrandIds.length > 0 && (
          <div style={{ marginLeft: "auto" }}>
            <MetaSpendSyncButton
              brandIds={metaBrandIds}
              since={from}
              until={to}
              label="전체 Meta 소진 갱신"
            />
          </div>
        )}
      </form>

      <div className="kpi-row">
        <div className="kpi">
          <div className="top">
            <span>총 예산</span>
          </div>
          <div className="v">{formatCurrency(totalBudget)}</div>
          <div className="d">
            <span>{from} ~ {to}</span>
          </div>
        </div>
        <div className="kpi">
          <div className="top">
            <span>총 소진</span>
          </div>
          <div className="v">{formatCurrency(totalSpend)}</div>
          <div className="d">
            <span>{formatPercent(totalPercent)}</span>
          </div>
        </div>
        <div className="kpi">
          <div className="top">
            <span>잔여 예산</span>
          </div>
          <div className="v">{formatCurrency(totalRemaining)}</div>
          <div className="d">
            <span>예산 대비 잔액</span>
          </div>
        </div>
        <div className="kpi">
          <div className="top">
            <span>관리 매체</span>
          </div>
          <div className="v">{activeMediaCount.toLocaleString("ko-KR")}</div>
          <div className="d">
            <span>초과 소진 {overspentMediaCount.toLocaleString("ko-KR")}개</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {brandSummaries.length === 0 ? (
          <div className="panel">
            <div className="empty">등록된 브랜드가 없습니다.</div>
          </div>
        ) : (
          brandSummaries.map((summary) => (
            <section key={summary.brand.id} className="panel">
              <div className="p-head" style={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontSize: 13, letterSpacing: 0, textTransform: "none" }}>
                    {summary.brand.name}
                  </h3>
                  <span className="sub">
                    매체 {summary.media.length.toLocaleString("ko-KR")}개 · 예산 {formatCurrency(summary.budget)} · 소진 {formatCurrency(summary.spend)}
                  </span>
                </div>
                <div style={{ minWidth: 260, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  {summary.metaAccountCount > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                      <MetaSpendSyncButton
                        brandIds={[summary.brand.id]}
                        since={from}
                        until={to}
                        label="Meta 소진 갱신"
                        compact
                      />
                      <span style={{ color: syncTone(summary.latestMetaSync), fontSize: 10 }}>
                        {syncMessage(summary.latestMetaSync)}
                      </span>
                    </div>
                  )}
                  <div style={{ width: 180 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--dim)", marginBottom: 6 }}>
                    <span>브랜드 소진율</span>
                    <b style={{ color: "var(--text)" }}>{formatPercent(summary.percent)}</b>
                  </div>
                  <div className="progress" style={{ height: 6 }}>
                    <b style={{ width: `${Math.min(100, summary.percent)}%`, background: barColor(summary.percent) }} />
                  </div>
                  </div>
                </div>
              </div>

              {summary.metaAccountCount > 0 && summary.spend === 0 && (
                <div
                  style={{
                    marginBottom: 12,
                    padding: "10px 12px",
                    border: "1px solid color-mix(in srgb, var(--amber) 34%, transparent)",
                    borderRadius: 8,
                    background: "color-mix(in srgb, var(--amber) 9%, transparent)",
                    color: "var(--text-2)",
                    fontSize: 11,
                    lineHeight: 1.55,
                  }}
                >
                  <b style={{ color: "var(--amber)" }}>Meta 소진 데이터 없음</b>
                  <span style={{ color: "var(--dim)" }}>
                    {" "}
                    · Meta 계정 {summary.metaAccountCount.toLocaleString("ko-KR")}개가 연결되어 있지만 선택 기간의 소진 기록이 없습니다. {syncMessage(summary.latestMetaSync)}
                  </span>
                </div>
              )}

              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>매체</th>
                      <th>상태</th>
                      <th className="num">예산</th>
                      <th className="num">소진</th>
                      <th className="num">잔여</th>
                      <th>소진율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.media.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ color: "var(--dim)", textAlign: "center" }}>
                          등록된 매체가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      summary.media.map((row) => {
                        const { campaign, spend, budget, remaining, percent, spendRecordCount } = row
                        const state = spendState(row)

                        return (
                          <tr key={campaign.id}>
                            <td>
                              <span className="tag neutral" style={{ marginRight: 8 }}>
                                {campaign.channel}
                              </span>
                              <span style={{ color: "var(--text)", fontWeight: 600 }}>{campaign.name}</span>
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span className={statusClass(campaign.status)}>{statusLabel(campaign.status)}</span>
                                <span className={state.className}>{state.label}</span>
                              </div>
                            </td>
                            <td className="num">{formatCurrency(budget)}</td>
                            <td className="num">
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                                <span style={{ color: "var(--text)", fontWeight: 700 }}>{formatCurrency(spend)}</span>
                                <span style={{ color: "var(--dim)", fontSize: 10 }}>
                                  {spendRecordCount > 0 ? `${spendRecordCount}건` : "기록 없음"}
                                </span>
                              </div>
                            </td>
                            <td className="num" style={{ color: remaining < 0 ? "var(--bad)" : "var(--text)" }}>
                              {formatCurrency(remaining)}
                            </td>
                            <td style={{ minWidth: 190 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5 }}>
                                <span style={{ color: "var(--dim)" }}>{formatPercent(percent)}</span>
                                {budget <= 0 && <span style={{ color: "var(--dim)" }}>예산 미설정</span>}
                              </div>
                              <div className="progress" style={{ height: 5 }}>
                                <b style={{ width: `${Math.min(100, percent)}%`, background: barColor(percent) }} />
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
