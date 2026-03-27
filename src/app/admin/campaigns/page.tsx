import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { BarChart2, Plus, Settings } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface PageProps {
  searchParams: Promise<{ brand?: string }>
}

export default async function AdminCampaignsPage({ searchParams }: PageProps) {
  const { brand: selectedBrandId } = await searchParams
  const supabase = await createClient()

  const [{ data: brands }, { data: allCampaigns }, { data: kpiCounts }, { data: budgets }] =
    await Promise.all([
      supabase.from("brands").select("id, name").order("name"),
      supabase
        .from("campaigns")
        .select("id, name, channel, status, start_date, end_date, brand_id")
        .order("created_at", { ascending: false }),
      supabase.from("kpi_definitions").select("campaign_id"),
      supabase
        .from("budgets")
        .select("campaign_id, total_budget, period_start, period_end"),
    ])

  const activeBrandId = selectedBrandId ?? brands?.[0]?.id ?? ""
  const activeBrand = brands?.find((b) => b.id === activeBrandId)

  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  const campaigns = allCampaigns?.filter((c) => c.brand_id === activeBrandId) ?? []

  function getKpiCount(campaignId: string) {
    return kpiCounts?.filter((k) => k.campaign_id === campaignId).length ?? 0
  }

  function getCurrentBudget(campaignId: string) {
    return budgets
      ?.filter(
        (b) => b.campaign_id === campaignId && b.period_start <= today && b.period_end >= today
      )
      .reduce((sum, b) => sum + Number(b.total_budget), 0) ?? 0
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">브랜드 KPI</h1>
        </div>
        <Link
          href={`/admin/campaigns/new${activeBrandId ? `?brand=${activeBrandId}` : ""}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          매체 추가
        </Link>
      </div>

      {/* Brand Tabs */}
      {brands && brands.length > 0 ? (
        <>
          <div className="flex gap-1 flex-wrap">
            {brands.map((brand) => {
              const count = allCampaigns?.filter((c) => c.brand_id === brand.id).length ?? 0
              return (
                <Link
                  key={brand.id}
                  href={`/admin/campaigns?brand=${brand.id}`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    brand.id === activeBrandId
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300"
                  }`}
                >
                  {brand.name}
                  <span className={`ml-1.5 text-xs ${brand.id === activeBrandId ? "text-blue-200" : "text-slate-400"}`}>
                    {count}
                  </span>
                </Link>
              )
            })}
          </div>

          {/* Campaign List for Active Brand */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {activeBrand?.name} · 매체별 KPI
              </h2>
              <span className="text-xs text-slate-400">{campaigns.length}개 매체</span>
            </div>

            {campaigns.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-slate-400 mb-3">등록된 매체가 없습니다.</p>
                <Link
                  href={`/admin/campaigns/new?brand=${activeBrandId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  첫 번째 매체 추가
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">매체</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">이름</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">상태</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">KPI</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">이번달 예산</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">설정</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {campaigns.map((c) => {
                      const kpiCount = getKpiCount(c.id)
                      const budget = getCurrentBudget(c.id)
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                          <td className="px-5 py-3">
                            <span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
                              {c.channel}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                          <td className="px-5 py-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-medium ${
                                c.status === "active"
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                  : c.status === "paused"
                                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              {c.status === "active" ? "진행중" : c.status === "paused" ? "일시중지" : "종료"}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            {kpiCount > 0 ? (
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{kpiCount}개 설정됨</span>
                            ) : (
                              <span className="text-xs text-slate-400">미설정</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {budget > 0 ? formatCurrency(budget) : <span className="text-xs text-slate-400">미설정</span>}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <Link
                                href={`/admin/campaigns/${c.id}/kpi`}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                              >
                                <Settings className="w-3 h-3" />
                                KPI
                              </Link>
                              </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <p className="text-sm text-slate-400 mb-3">먼저 브랜드를 등록해주세요.</p>
          <Link href="/admin/brands" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            브랜드 관리 →
          </Link>
        </div>
      )}
    </div>
  )
}
