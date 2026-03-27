import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { campaign_id, kpis } = await request.json()
  if (!campaign_id) return NextResponse.json({ error: "campaign_id 필요" }, { status: 400 })

  const admin = createAdminClient()

  // 기존 KPI 삭제 후 재삽입
  await admin.from("kpi_definitions").delete().eq("campaign_id", campaign_id)

  if (kpis && kpis.length > 0) {
    const { error } = await admin.from("kpi_definitions").insert(
      kpis.map((k: { metric_key: string; label: string; unit: string; is_visible: boolean }, i: number) => ({
        campaign_id,
        metric_key: k.metric_key,
        label: k.label,
        unit: k.unit,
        display_order: i,
        is_visible: k.is_visible,
      }))
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
