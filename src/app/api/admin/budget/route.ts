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

// 예산 추가
export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { campaign_id, period_start, period_end, total_budget } = await request.json()
  if (!campaign_id || !period_start || !period_end || total_budget === undefined || total_budget === null) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 })
  }
  const budgetNum = Number(total_budget)
  if (!Number.isFinite(budgetNum) || budgetNum < 0) {
    return NextResponse.json({ error: "total_budget은 0 이상의 숫자여야 합니다" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("budgets")
    .insert({ campaign_id, period_start, period_end, total_budget: budgetNum })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// 예산 삭제
export async function DELETE(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from("budgets").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
