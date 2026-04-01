import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { BarChart2, DollarSign, Image, ArrowRight, AlertCircle, TrendingUp } from "lucide-react"
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils"
import { STATUS_LABELS, STATUS_COLORS } from "@/types"
import type { CalendarEventStatus } from "@/types"

const CHANNEL_COLORS: Record<string, string> = {
  Meta: "bg-blue-500", Instagram: "bg-pink-500", Facebook: "bg-blue-600",
  Google: "bg-yellow-500", Naver: "bg-green-500", Kakao: "bg-yellow-400",
  TikTok: "bg-slate-800", YouTube: "bg-red-500", GA4: "bg-orange-500",
}

const CHANNEL_TEXT_COLORS: Record<string, string> = {
  Meta: "text-blue-600", Instagram: "text-pink-600", Facebook: "text-blue-700",
  Google: "text-yellow-600", Naver: "text-green-600", Kakao: "text-yellow-500",
  TikTok: "text-slate-700", YouTube: "text-red-600", GA4: "text-orange-600",
}

export default async function DashboardPage() {
  const h = await headers()
  const userId = h.get("x-user-id")
  const userName = decodeURIComponent(h.get("x-user-name") ?? "")
  const brandIdsHeader = h.get("x-user-brand-ids")
  const brandName = h.get("x-user-brand-name")
    ? decodeURIComponent(h.get("x-user-brand-name")!)
    : null

  if (!userId) redirect("/login")

  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []

  if (brandIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <AlertCircle className="w-10 h-10 mb-3" />
        <p>연결된 브랜드가 없습니다. 담당자에게 문의하세요.</p>
      </div>
    )
  }

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const monthEnd = now.toISOString().slice(0, 10)
  const weekEnd = new Date(now)
  weekEnd.setDate(now.getDate() + 7)
  const weekEndStr = weekEnd.toISOString().slice(0, 10)

  const supabase = await createClient()

  // Round 1: 브랜드ID 기반 쿼리 모두 병렬 실행
  const [campaignsResult, activitiesResult, eventsResult, creativesResult, utmEntriesResult] = await Promise.all([
    supabase.from("campaigns").select("id, channel").in("brand_id", brandIds),
    supabase
      .from("activities")
      .select("id, title, content, channel, activity_date")
      .in("brand_id", brandIds)
      .order("activity_date", { ascending: false })
      .limit(3),
    supabase
      .from("calendar_events")
      .select("id, title, channel, event_date, status")
      .in("brand_id", brandIds)
      .gte("event_date", monthStart)
      .lte("event_date", weekEndStr)
      .order("event_date", { ascending: true })
      .limit(5),
    supabase.from("creatives").select("status").in("brand_id", brandIds),
    supabase.from("ga4_utm_entries").select("id").in("brand_id", brandIds),
  ])

  const campaigns = campaignsResult.data ?? []
  const campaignIds = campaigns.map((c) => c.id)
  const utmEntryIds = utmEntriesResult.data?.map((e) => e.id) ?? []

  // Round 2: 캠페인ID 기반 + UTM 성과 쿼리 병렬 실행
  const [spendResult, budgetResult, perfResult, utmPerfResult] = await Promise.all([
    campaignIds.length > 0
      ? supabase.from("spend_records").select("campaign_id, amount").in("campaign_id", campaignIds).gte("spend_date", monthStart).lte("spend_date", monthEnd)
      : Promise.resolve({ data: [] }),
    campaignIds.length > 0
      ? supabase.from("budgets").select("campaign_id, total_budget").in("campaign_id", campaignIds).lte("period_start", monthEnd).gte("period_end", monthStart)
      : Promise.resolve({ data: [] }),
    campaignIds.length > 0
      ? supabase.from("performance_records").select("campaign_id, values").in("campaign_id", campaignIds).gte("record_date", monthStart).lte("record_date", monthEnd)
      : Promise.resolve({ data: [] }),
    utmEntryIds.length > 0
      ? supabase.from("ga4_utm_performance").select("sessions, users, pageviews, conversions, revenue").in("utm_entry_id", utmEntryIds).gte("record_date", monthStart).lte("record_date", monthEnd)
      : Promise.resolve({ data: [] }),
  ])

  const spendRecords = spendResult.data ?? []
  const budgetRecords = budgetResult.data ?? []
  const perfRecords = perfResult.data ?? []
  const utmPerfRecords = utmPerfResult.data ?? []

  const totalSpend = spendRecords.reduce((sum, r) => sum + Number(r.amount), 0)
  const totalBudget = budgetRecords.reduce((sum, b) => sum + Number(b.total_budget), 0)
  const budgetPercent = totalBudget > 0 ? Math.min(100, (totalSpend / totalBudget) * 100) : 0

  // ── 채널별 집계
  const channelSet = new Set(campaigns.map((c) => c.channel))
  const channelSummaries = Array.from(channelSet).sort().map((channel) => {
    const chCampaignIds = campaigns.filter((c) => c.channel === channel).map((c) => c.id)
    const chSpend = spendRecords.filter((r) => chCampaignIds.includes(r.campaign_id)).reduce((s, r) => s + Number(r.amount), 0)
    const chBudget = budgetRecords.filter((b) => chCampaignIds.includes(b.campaign_id)).reduce((s, b) => s + Number(b.total_budget), 0)
    const chCampaignCount = chCampaignIds.length

    // KPI 집계 (impressions, clicks 등이 있으면 표시)
    const chPerf = perfRecords.filter((r) => chCampaignIds.includes(r.campaign_id))
    const kpiTotals: Record<string, number> = {}
    for (const rec of chPerf) {
      for (const [k, v] of Object.entries(rec.values as Record<string, number>)) {
        kpiTotals[k] = (kpiTotals[k] ?? 0) + v
      }
    }

    return { channel, campaignCount: chCampaignCount, spend: chSpend, budget: chBudget, kpiTotals }
  })

  // ── GA4 UTM 집계
  const ga4Totals = {
    sessions: utmPerfRecords.reduce((s, p) => s + p.sessions, 0),
    users: utmPerfRecords.reduce((s, p) => s + p.users, 0),
    pageviews: utmPerfRecords.reduce((s, p) => s + p.pageviews, 0),
    conversions: utmPerfRecords.reduce((s, p) => s + p.conversions, 0),
    revenue: utmPerfRecords.reduce((s, p) => s + Number(p.revenue), 0),
  }
  const hasGa4Data = utmEntryIds.length > 0

  const creativeStats = creativesResult.data ?? []
  const creativeCounts = {
    review_requested: creativeStats.filter((c) => c.status === "review_requested").length,
    feedback_pending: creativeStats.filter((c) => c.status === "feedback_pending").length,
    completed: creativeStats.filter((c) => c.status === "completed").length,
  }

  const greeting = userName ? `${userName}님` : "안녕하세요"
  const activities = activitiesResult.data
  const upcomingEvents = eventsResult.data

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">안녕하세요, {greeting} 👋</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {brandName} · {now.getFullYear()}년 {now.getMonth() + 1}월 현황
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 성과 요약 */}
        <Link href="/dashboard/performance" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-sm transition group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">성과 요약</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-slate-400">이번 달 캠페인 수</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{campaignIds.length}</p>
            <p className="text-xs text-slate-400">성과 상세 보기 →</p>
          </div>
        </Link>

        {/* 예산 현황 */}
        <Link href="/dashboard/performance" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-sm transition group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">예산 현황</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
          </div>
          {totalBudget > 0 ? (
            <>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>지출 {formatCurrency(totalSpend)}</span>
                  <span>{budgetPercent.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${budgetPercent}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400">
                총 예산 {formatCurrency(totalBudget)} · 잔여 {formatCurrency(totalBudget - totalSpend)}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400 mt-2">예산 정보 없음</p>
          )}
        </Link>

        {/* 소재 현황 */}
        <Link href="/dashboard/creatives" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-sm transition group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                <Image className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">소재 현황</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">검토 요청</span>
              <span className="font-semibold text-blue-600">{creativeCounts.review_requested}건</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">피드백 대기</span>
              <span className="font-semibold text-yellow-600">{creativeCounts.feedback_pending}건</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">완료</span>
              <span className="font-semibold text-emerald-600">{creativeCounts.completed}건</span>
            </div>
          </div>
        </Link>
      </div>

      {/* ── 매체별 성과 ── */}
      {(channelSummaries.length > 0 || hasGa4Data) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">매체별 성과</h2>
            <Link href="/dashboard/performance" className="text-xs text-blue-600 hover:text-blue-700">상세보기</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {channelSummaries.map((cs) => {
              const budgetPct = cs.budget > 0 ? Math.min(100, (cs.spend / cs.budget) * 100) : 0
              // 주요 KPI 3개까지 표시
              const kpiEntries = Object.entries(cs.kpiTotals).slice(0, 3)

              return (
                <Link
                  key={cs.channel}
                  href={`/dashboard/performance?channel=${cs.channel}`}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-sm transition group"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${CHANNEL_COLORS[cs.channel] ?? "bg-slate-400"}`} />
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{cs.channel}</span>
                    <span className="text-[10px] text-slate-400 ml-auto">{cs.campaignCount}개 캠페인</span>
                  </div>

                  {/* 지출/예산 */}
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">이번 달 지출</span>
                      <span className={`font-semibold ${CHANNEL_TEXT_COLORS[cs.channel] ?? "text-slate-700"} dark:text-slate-200`}>
                        {formatCurrency(cs.spend)}
                      </span>
                    </div>
                    {cs.budget > 0 && (
                      <>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${budgetPct}%`,
                              backgroundColor: budgetPct > 90 ? "#ef4444" : budgetPct > 70 ? "#f59e0b" : "#10b981",
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>예산 {formatCurrency(cs.budget)}</span>
                          <span>{budgetPct.toFixed(0)}%</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* KPI */}
                  {kpiEntries.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-2 space-y-1">
                      {kpiEntries.map(([key, val]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-slate-400 truncate max-w-[100px]">{key}</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{formatNumber(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Link>
              )
            })}

            {/* GA4 UTM 카드 */}
            {hasGa4Data && (
              <Link
                href="/dashboard/ga4"
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-sm transition group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">GA4</span>
                  <span className="text-[10px] text-slate-400 ml-auto">{utmEntryIds.length}개 UTM</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">세션</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">{formatNumber(ga4Totals.sessions)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">사용자</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{formatNumber(ga4Totals.users)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">페이지뷰</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{formatNumber(ga4Totals.pageviews)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">전환수</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{formatNumber(ga4Totals.conversions)}</span>
                  </div>
                  {ga4Totals.revenue > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">수익</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(ga4Totals.revenue)}</span>
                    </div>
                  )}
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Bottom Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 최근 운영 현황 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">📌 최근 운영 현황</h3>
            <Link href="/dashboard/activity" className="text-xs text-blue-600 hover:text-blue-700">
              전체보기
            </Link>
          </div>
          {activities && activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="border-l-2 border-blue-200 dark:border-blue-700 pl-3">
                  <p className="text-xs text-slate-400 mb-0.5">
                    {a.channel && <span className="font-medium text-slate-600 dark:text-slate-400">[{a.channel}]</span>}{" "}
                    {formatDate(a.activity_date)}
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">{a.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{a.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">운영 현황이 없습니다.</p>
          )}
        </div>

        {/* 이번주 예정 일정 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">📅 예정 일정</h3>
            <Link href="/dashboard/calendar" className="text-xs text-blue-600 hover:text-blue-700">
              전체보기
            </Link>
          </div>
          {upcomingEvents && upcomingEvents.length > 0 ? (
            <div className="space-y-2.5">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-start gap-3">
                  <span className="text-xs text-slate-400 w-16 flex-shrink-0 pt-0.5">
                    {formatDate(e.event_date)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {e.channel && (
                        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                          {e.channel}
                        </span>
                      )}
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[e.status as CalendarEventStatus]}`}
                      >
                        {STATUS_LABELS[e.status as CalendarEventStatus]}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 dark:text-slate-200 mt-0.5 truncate">{e.title}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">예정된 일정이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}
