import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import KpiEditor from "@/components/admin/KpiEditor"
import BudgetEditor from "@/components/admin/BudgetEditor"
import Link from "next/link"

export default async function KpiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [campaignResult, kpiResult, budgetResult] = await Promise.all([
    supabase.from("campaigns").select("id, name, channel, brands(name)").eq("id", id).single(),
    supabase.from("kpi_definitions").select("*").eq("campaign_id", id).order("display_order"),
    supabase.from("budgets").select("id, period_start, period_end, total_budget").eq("campaign_id", id).order("period_start", { ascending: false }),
  ])

  if (!campaignResult.data) notFound()
  const campaign = campaignResult.data

  return (
    <div className="console-scope canvas">
      <Link href="/admin/campaigns" className="back">브랜드 KPI</Link>

      <div className="page-head">
        <h1>KPI · <em>Budget</em></h1>
        <p className="sub">
          {(campaign.brands as unknown as { name: string } | null)?.name} · {campaign.channel} · {campaign.name}
        </p>
      </div>

      {/* KPI 설정 */}
      <div className="panel">
        <div className="p-head"><h3>KPI 지표</h3></div>
        <div className="p-body">
          <KpiEditor campaignId={id} initialKpis={kpiResult.data ?? []} />
        </div>
      </div>

      {/* 예산 설정 */}
      <div className="panel">
        <div className="p-head"><h3>예산 설정</h3></div>
        <div className="p-body">
          <BudgetEditor campaignId={id} initialBudgets={budgetResult.data ?? []} />
        </div>
      </div>
    </div>
  )
}
