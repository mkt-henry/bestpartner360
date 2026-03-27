import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import BudgetEditor from "@/components/admin/BudgetEditor"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, channel, brands(name)")
    .eq("id", id)
    .single()

  if (!campaign) notFound()

  const { data: budgets } = await supabase
    .from("budgets")
    .select("id, period_start, period_end, total_budget")
    .eq("campaign_id", id)
    .order("period_start", { ascending: false })

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
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">예산 설정</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {(campaign.brands as unknown as { name: string } | null)?.name} · {campaign.channel} · {campaign.name}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <BudgetEditor
          campaignId={id}
          initialBudgets={budgets ?? []}
        />
      </div>
    </div>
  )
}
