import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  syncMetaSpendForBrand,
  syncNaverSpendForBrand,
  type SyncResult,
} from "@/lib/spend-sync"

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

  const admin = createAdminClient()
  const [metaAccRes, naverAccRes] = await Promise.all([
    admin.from("meta_ad_accounts").select("id").eq("brand_id", brand_id).limit(1),
    admin.from("naver_ad_accounts").select("id").eq("brand_id", brand_id).limit(1),
  ])

  const hasMeta = (metaAccRes.data?.length ?? 0) > 0
  const hasNaver = (naverAccRes.data?.length ?? 0) > 0

  if (!hasMeta && !hasNaver) {
    return NextResponse.json(
      { error: "이 브랜드에 연결된 Meta / Naver 광고 계정이 없습니다." },
      { status: 400 }
    )
  }

  let meta: SyncResult | null = null
  let naver: SyncResult | null = null

  if (hasMeta) meta = await syncMetaSpendForBrand(brand_id)
  if (hasNaver) naver = await syncNaverSpendForBrand(brand_id)

  return NextResponse.json({ meta, naver })
}
