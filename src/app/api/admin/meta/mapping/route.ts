import { NextRequest, NextResponse } from "next/server"
import { runMetaCampaignSync } from "@/lib/ad-platform-sync/service"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const { brand_id, meta_account_id, meta_account_name, trigger_sync = true } = await req.json()

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

  if (!trigger_sync) {
    return NextResponse.json({ ok: true, sync_triggered: false })
  }

  try {
    const syncResult = await runMetaCampaignSync({ brandIds: [brand_id] })
    return NextResponse.json({
      ok: true,
      sync_triggered: true,
      sync_result: syncResult,
    })
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : "Unknown sync error"
    return NextResponse.json({
      ok: true,
      sync_triggered: true,
      sync_error: message,
    })
  }
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
