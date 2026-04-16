import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import BudgetEditor from "@/components/admin/BudgetEditor"
import Link from "next/link"

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
    <div className="console-scope canvas">
      <Link href="/admin/campaigns" className="back">브랜드 KPI</Link>

      <div className="page-head">
        <h1>예산 <em>설정</em></h1>
        <p className="sub">
          {(campaign.brands as unknown as { name: string } | null)?.name} · {campaign.channel} · {campaign.name}
        </p>
      </div>

      <div className="panel">
        <div className="p-body">
          <BudgetEditor
            campaignId={id}
            initialBudgets={budgets ?? []}
          />
        </div>
      </div>
    </div>
  )
}
