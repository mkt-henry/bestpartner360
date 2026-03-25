import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import PerformanceDataEditor from "@/components/admin/PerformanceDataEditor"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function CampaignDataPage({ params }: { params: Promise<{ id: string }> }) {
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
    .select("metric_key, label, unit")
    .eq("campaign_id", id)
    .eq("is_visible", true)
    .order("display_order")

  // 최근 30일 데이터
  const from = new Date()
  from.setDate(from.getDate() - 30)
  const fromStr = from.toISOString().slice(0, 10)

  const { data: records } = await supabase
    .from("performance_records")
    .select("record_date, values")
    .eq("campaign_id", id)
    .gte("record_date", fromStr)
    .order("record_date", { ascending: false })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition"
      >
        <ChevronLeft className="w-4 h-4" />
        캠페인 목록
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">성과 수치 입력</h1>
        <p className="text-sm text-slate-500 mt-1">
          {(campaign.brands as unknown as { name: string } | null)?.name} · {campaign.channel} · {campaign.name}
        </p>
      </div>

      {kpiDefs && kpiDefs.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-sm text-yellow-700">
          먼저{" "}
          <Link href={`/admin/campaigns/${id}/kpi`} className="font-semibold underline">
            KPI 지표
          </Link>
          를 설정해주세요.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <PerformanceDataEditor
            campaignId={id}
            kpiDefs={kpiDefs ?? []}
            initialRecords={records ?? []}
          />
        </div>
      )}
    </div>
  )
}
