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

  // 최근 60일 지출
  const from = new Date()
  from.setDate(from.getDate() - 60)

  const { data: spendRecords } = await supabase
    .from("spend_records")
    .select("spend_date, amount")
    .eq("campaign_id", id)
    .gte("spend_date", from.toISOString().slice(0, 10))
    .order("spend_date", { ascending: false })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/admin/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition"
      >
        <ChevronLeft className="w-4 h-4" />
        캠페인 목록
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">예산 / 지출 관리</h1>
        <p className="text-sm text-slate-500 mt-1">
          {(campaign.brands as unknown as { name: string } | null)?.name} · {campaign.channel} · {campaign.name}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <BudgetEditor
          campaignId={id}
          initialBudgets={budgets ?? []}
          initialSpends={spendRecords ?? []}
        />
      </div>
    </div>
  )
}
