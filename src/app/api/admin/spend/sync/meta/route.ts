import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { syncMetaSpendForBrand } from "@/lib/spend-sync"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return null
  return user
}

export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { brand_id } = await request.json()
  if (!brand_id) return NextResponse.json({ error: "brand_id 필요" }, { status: 400 })

  const result = await syncMetaSpendForBrand(brand_id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 })
  }
  return NextResponse.json({
    synced: result.synced,
    message: result.message,
    unmatched: result.unmatched,
  })
}
