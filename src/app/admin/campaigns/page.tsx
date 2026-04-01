import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { BarChart2 } from "lucide-react"
import BrandKpiManager from "@/components/admin/BrandKpiManager"

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
        .select("id, name, channel, start_date, end_date, brand_id")
        .order("created_at", { ascending: false }),
      supabase.from("kpi_definitions").select("campaign_id"),
      supabase
        .from("budgets")
        .select("id, campaign_id, total_budget, period_start, period_end")
        .order("period_start", { ascending: false }),
    ])

  const activeBrandId = selectedBrandId ?? brands?.[0]?.id ?? ""
  const activeBrand = brands?.find((b) => b.id === activeBrandId)

  const campaigns = allCampaigns?.filter((c) => c.brand_id === activeBrandId) ?? []

  const campaignsWithKpi = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    channel: c.channel,
    start_date: c.start_date,
    end_date: c.end_date,
    kpiCount: kpiCounts?.filter((k) => k.campaign_id === c.id).length ?? 0,
  }))

  const brandBudgets =
    budgets
      ?.filter((b) => campaigns.some((c) => c.id === b.campaign_id))
      .map((b) => ({
        id: b.id,
        campaign_id: b.campaign_id,
        period_start: b.period_start,
        period_end: b.period_end,
        total_budget: Number(b.total_budget),
      })) ?? []

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart2 className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">브랜드 KPI</h1>
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

          <BrandKpiManager
            key={activeBrandId}
            brandId={activeBrandId}
            initialCampaigns={campaignsWithKpi}
            initialBudgets={brandBudgets}
          />
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
