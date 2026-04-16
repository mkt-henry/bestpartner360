import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
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
    <div className="console-scope canvas">
      <div className="page-head">
        <h1>브랜드 <em>KPI</em></h1>
      </div>

      {/* Brand Tabs */}
      {brands && brands.length > 0 ? (
        <>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {brands.map((brand) => {
              const count = allCampaigns?.filter((c) => c.brand_id === brand.id).length ?? 0
              return (
                <Link
                  key={brand.id}
                  href={`/admin/campaigns?brand=${brand.id}`}
                  className={brand.id === activeBrandId ? "chip on" : "chip"}
                >
                  {brand.name}
                  <span style={{ marginLeft: "0.375rem", fontSize: "0.75rem", opacity: 0.6 }}>
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
        <div className="panel">
          <div className="empty">
            <p>먼저 브랜드를 등록해주세요.</p>
            <Link href="/admin/brands" style={{ color: "var(--amber)", fontWeight: 500 }}>
              브랜드 관리 →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
