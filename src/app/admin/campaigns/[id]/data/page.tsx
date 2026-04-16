import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import PerformanceDataEditor from "@/components/admin/PerformanceDataEditor"
import Link from "next/link"

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
    <div className="console-scope canvas">
      <Link href="/admin/campaigns" className="back">브랜드 KPI</Link>

      <div className="page-head">
        <h1>Performance <em>Data</em></h1>
        <p className="sub">
          {(campaign.brands as unknown as { name: string } | null)?.name} · {campaign.channel} · {campaign.name}
        </p>
      </div>

      {kpiDefs && kpiDefs.length === 0 ? (
        <div
          style={{
            background: "var(--amber-dim)",
            color: "var(--amber)",
            border: "1px solid var(--amber)",
            borderRadius: "0.5rem",
            padding: "1.25rem",
            fontSize: "0.875rem",
          }}
        >
          먼저{" "}
          <Link href={`/admin/campaigns/${id}/kpi`} style={{ fontWeight: 600, textDecoration: "underline", color: "var(--amber)" }}>
            KPI 지표
          </Link>
          를 설정해주세요.
        </div>
      ) : (
        <div className="panel">
          <div className="p-body">
            <PerformanceDataEditor
              campaignId={id}
              kpiDefs={kpiDefs ?? []}
              initialRecords={records ?? []}
            />
          </div>
        </div>
      )}
    </div>
  )
}
