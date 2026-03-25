import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import KpiEditor from "@/components/admin/KpiEditor"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function KpiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, channel, brands(name)")
    .eq("id", id)
    .single()

  if (!campaign) notFound()

  const { data: kpiDefs } = await supabase
    .from("kpi_definitions")
    .select("*")
    .eq("campaign_id", id)
    .order("display_order")

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
        <h1 className="text-xl font-bold text-slate-900">KPI 지표 설정</h1>
        <p className="text-sm text-slate-500 mt-1">
          {(campaign.brands as unknown as { name: string } | null)?.name} · {campaign.channel} · {campaign.name}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <KpiEditor campaignId={id} initialKpis={kpiDefs ?? []} />
      </div>
    </div>
  )
}
