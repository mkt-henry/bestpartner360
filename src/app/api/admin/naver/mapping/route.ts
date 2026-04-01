import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const { brand_id, naver_customer_id, naver_account_name } = await req.json()

  if (!brand_id || !naver_customer_id || !naver_account_name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from("naver_ad_accounts").upsert(
    { brand_id, naver_customer_id, naver_account_name },
    { onConflict: "naver_customer_id" }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { naver_customer_id } = await req.json()

  if (!naver_customer_id) {
    return NextResponse.json({ error: "Missing naver_customer_id" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("naver_ad_accounts")
    .delete()
    .eq("naver_customer_id", naver_customer_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
