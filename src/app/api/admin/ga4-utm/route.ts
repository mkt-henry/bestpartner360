import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// UTM 항목 추가
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { brand_id, label, landing_url, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = body

  if (!brand_id || !label || !utm_source || !utm_medium) {
    return NextResponse.json({ error: "브랜드, 이름, utm_source, utm_medium은 필수입니다." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("ga4_utm_entries")
    .insert({
      brand_id, label, landing_url: landing_url || null,
      utm_source, utm_medium,
      utm_campaign: utm_campaign || null,
      utm_term: utm_term || null,
      utm_content: utm_content || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// UTM 항목 삭제
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from("ga4_utm_entries").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
