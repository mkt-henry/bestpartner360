import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import KpiEditor from "@/components/admin/KpiEditor"
import BudgetEditor from "@/components/admin/BudgetEditor"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

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
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/admin/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
      >
        <ChevronLeft className="w-4 h-4" />
        브랜드 KPI
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">KPI · 예산 설정</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {(campaign.brands as unknown as { name: string } | null)?.name} · {campaign.channel} · {campaign.name}
        </p>
      </div>

      {/* KPI 설정 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">KPI 지표</h2>
        <KpiEditor campaignId={id} initialKpis={kpiResult.data ?? []} />
      </div>

      {/* 예산 설정 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">예산 설정</h2>
        <BudgetEditor campaignId={id} initialBudgets={budgetResult.data ?? []} />
      </div>
    </div>
  )
}
