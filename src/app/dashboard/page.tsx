import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { BarChart2, DollarSign, Image, ArrowRight, AlertCircle } from "lucide-react"
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils"
import { STATUS_LABELS, STATUS_COLORS } from "@/types"
import type { CalendarEventStatus } from "@/types"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single()

  // viewer의 접근 가능한 브랜드 가져오기
  const { data: brandAccess } = await supabase
    .from("user_brand_access")
    .select("brand_id, brands(id, name)")
    .eq("user_id", user.id)

  const brandIds = brandAccess?.map((b) => b.brand_id) ?? []
  const primaryBrand = (brandAccess?.[0]?.brands as unknown as { id: string; name: string } | null)

  if (brandIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <AlertCircle className="w-10 h-10 mb-3" />
        <p>연결된 브랜드가 없습니다. 담당자에게 문의하세요.</p>
      </div>
    )
  }

  // 이번달 성과 합산 (모든 캠페인)
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id")
    .in("brand_id", brandIds)

  const campaignIds = campaigns?.map((c) => c.id) ?? []

  // 이번달 지출 합계
  const { data: spendData } = await supabase
    .from("spend_records")
    .select("amount")
    .in("campaign_id", campaignIds)
    .gte("spend_date", monthStart)
    .lte("spend_date", monthEnd)

  const totalSpend = spendData?.reduce((sum, r) => sum + Number(r.amount), 0) ?? 0

  // 이번달 예산 합계
  const { data: budgets } = await supabase
    .from("budgets")
    .select("total_budget")
    .in("campaign_id", campaignIds)
    .lte("period_start", monthEnd)
    .gte("period_end", monthStart)

  const totalBudget = budgets?.reduce((sum, b) => sum + Number(b.total_budget), 0) ?? 0

  // 최근 운영 현황
  const { data: activities } = await supabase
    .from("activities")
    .select("id, title, content, channel, activity_date")
    .in("brand_id", brandIds)
    .order("activity_date", { ascending: false })
    .limit(3)

  // 이번주 예정 일정
  const weekEnd = new Date(now)
  weekEnd.setDate(now.getDate() + 7)
  const weekEndStr = weekEnd.toISOString().slice(0, 10)

  const { data: upcomingEvents } = await supabase
    .from("calendar_events")
    .select("id, title, channel, event_date, status")
    .in("brand_id", brandIds)
    .gte("event_date", monthStart)
    .lte("event_date", weekEndStr)
    .order("event_date", { ascending: true })
    .limit(5)

  // 소재 현황
  const { data: creativeStats } = await supabase
    .from("creatives")
    .select("status")
    .in("brand_id", brandIds)

  const creativeCounts = {
    review_requested: creativeStats?.filter((c) => c.status === "review_requested").length ?? 0,
    feedback_pending: creativeStats?.filter((c) => c.status === "feedback_pending").length ?? 0,
    completed: creativeStats?.filter((c) => c.status === "completed").length ?? 0,
  }

  const budgetPercent = totalBudget > 0 ? Math.min(100, (totalSpend / totalBudget) * 100) : 0
  const greeting = profile?.full_name ? `${profile.full_name}님` : "안녕하세요"

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">안녕하세요, {greeting} 👋</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {primaryBrand?.name} · {now.getFullYear()}년 {now.getMonth() + 1}월 현황
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* 성과 요약 */}
        <Link href="/dashboard/performance" className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">성과 요약</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-slate-400">이번 달 캠페인 수</p>
            <p className="text-2xl font-bold text-slate-900">{campaignIds.length}</p>
            <p className="text-xs text-slate-400">성과 상세 보기 →</p>
          </div>
        </Link>

        {/* 예산 현황 */}
        <Link href="/dashboard/performance" className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">예산 현황</span>
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
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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
        <Link href="/dashboard/creatives" className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <Image className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">소재 현황</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">검토 요청</span>
              <span className="font-semibold text-blue-600">{creativeCounts.review_requested}건</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">피드백 대기</span>
              <span className="font-semibold text-yellow-600">{creativeCounts.feedback_pending}건</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">완료</span>
              <span className="font-semibold text-emerald-600">{creativeCounts.completed}건</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-2 gap-4">
        {/* 최근 운영 현황 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">📌 최근 운영 현황</h3>
            <Link href="/dashboard/activity" className="text-xs text-blue-600 hover:text-blue-700">
              전체보기
            </Link>
          </div>
          {activities && activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="border-l-2 border-blue-200 pl-3">
                  <p className="text-xs text-slate-400 mb-0.5">
                    {a.channel && <span className="font-medium text-slate-600">[{a.channel}]</span>}{" "}
                    {formatDate(a.activity_date)}
                  </p>
                  <p className="text-sm font-medium text-slate-900 leading-snug">{a.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{a.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">운영 현황이 없습니다.</p>
          )}
        </div>

        {/* 이번주 예정 일정 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">📅 예정 일정</h3>
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
                        <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {e.channel}
                        </span>
                      )}
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[e.status as CalendarEventStatus]}`}
                      >
                        {STATUS_LABELS[e.status as CalendarEventStatus]}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 mt-0.5 truncate">{e.title}</p>
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
