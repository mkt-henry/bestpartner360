import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import KpiEditor from "@/components/admin/KpiEditor"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

export default async function KpiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [campaignResult, kpiResult, budgetResult] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name, channel, start_date, end_date, brands(name)")
      .eq("id", id)
      .single(),
    supabase.from("kpi_definitions").select("*").eq("campaign_id", id).order("display_order"),
    supabase
      .from("budgets")
      .select("id, period_start, period_end, total_budget")
      .eq("campaign_id", id)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!campaignResult.data) notFound()
  const campaign = campaignResult.data
  const brandName = (campaign.brands as unknown as { name: string } | null)?.name
  const budget = budgetResult.data

  return (
    <div className="console-scope canvas">
      <Link href="/admin/campaigns" className="back">브랜드 KPI</Link>

      <div className="page-head">
        <h1>
          KPI <em>지표</em>
        </h1>
        <p className="sub">
          {brandName} · <span className="tag neutral" style={{ marginLeft: 4, marginRight: 4 }}>{campaign.channel}</span>
          {campaign.start_date} ~ {campaign.end_date ?? "미정"}
          {budget && (
            <span style={{ marginLeft: "0.75rem", color: "var(--dim)" }}>
              · 예산 {formatCurrency(Number(budget.total_budget))}
            </span>
          )}
        </p>
      </div>

      {/* KPI 설정 */}
      <div className="panel">
        <div className="p-head">
          <h3>KPI 지표</h3>
        </div>
        <div className="p-body">
          <KpiEditor campaignId={id} initialKpis={kpiResult.data ?? []} />
        </div>
      </div>
    </div>
  )
}
