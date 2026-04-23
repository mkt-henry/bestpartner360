import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return null
  return user
}

// 지출 목록 조회
// - campaign_id: 해당 캠페인의 지출 목록
// - brand_id: 해당 브랜드 전체 캠페인의 지출 합계(campaign_id별)
export async function GET(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get("campaign_id")
  const brandId = searchParams.get("brand_id")
  const admin = createAdminClient()

  if (campaignId) {
    const { data, error } = await admin
      .from("spend_records")
      .select("id, campaign_id, spend_date, amount")
      .eq("campaign_id", campaignId)
      .order("spend_date", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ spends: data ?? [] })
  }

  if (brandId) {
    const { data: campaigns, error: campErr } = await admin
      .from("campaigns")
      .select("id")
      .eq("brand_id", brandId)
    if (campErr) return NextResponse.json({ error: campErr.message }, { status: 400 })
    const campaignIds = (campaigns ?? []).map((c) => c.id)
    if (campaignIds.length === 0) return NextResponse.json({ totals: {} })

    const { data, error } = await admin
      .from("spend_records")
      .select("campaign_id, amount")
      .in("campaign_id", campaignIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const totals: Record<string, number> = {}
    for (const row of data ?? []) {
      totals[row.campaign_id] = (totals[row.campaign_id] ?? 0) + Number(row.amount ?? 0)
    }
    return NextResponse.json({ totals })
  }

  return NextResponse.json({ error: "campaign_id 또는 brand_id 필요" }, { status: 400 })
}

// 지출 추가/수정 (campaign_id + spend_date 복합 유니크 → upsert)
export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { campaign_id, spend_date, amount } = await request.json()
  if (!campaign_id || !spend_date || amount == null) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("spend_records")
    .upsert(
      { campaign_id, spend_date, amount: Number(amount) },
      { onConflict: "campaign_id,spend_date" }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// 지출 삭제
export async function DELETE(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from("spend_records").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
