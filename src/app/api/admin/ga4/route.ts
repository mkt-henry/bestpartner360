import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const { brand_id, property_id, property_name, website_url } = await req.json()

  if (!brand_id || !property_id || !property_name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from("ga4_properties").upsert(
    { brand_id, property_id, property_name, website_url: website_url || null },
    { onConflict: "property_id" }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { property_id } = await req.json()

  if (!property_id) {
    return NextResponse.json({ error: "Missing property_id" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("ga4_properties")
    .delete()
    .eq("property_id", property_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
