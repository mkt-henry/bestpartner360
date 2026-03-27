import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const { brand_id, meta_account_id, meta_account_name } = await req.json()

  if (!brand_id || !meta_account_id || !meta_account_name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from("meta_ad_accounts").upsert(
    { brand_id, meta_account_id, meta_account_name },
    { onConflict: "meta_account_id" }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { meta_account_id } = await req.json()

  if (!meta_account_id) {
    return NextResponse.json({ error: "Missing meta_account_id" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("meta_ad_accounts")
    .delete()
    .eq("meta_account_id", meta_account_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
