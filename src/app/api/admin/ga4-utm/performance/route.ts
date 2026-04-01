import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const { utm_entry_id, record_date, sessions, users, pageviews, bounce_rate, avg_session_duration, conversions, revenue } = await req.json()

  if (!utm_entry_id || !record_date) {
    return NextResponse.json({ error: "UTM 항목과 날짜는 필수입니다." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("ga4_utm_performance")
    .upsert(
      {
        utm_entry_id, record_date,
        sessions: sessions ?? 0,
        users: users ?? 0,
        pageviews: pageviews ?? 0,
        bounce_rate: bounce_rate ?? null,
        avg_session_duration: avg_session_duration ?? null,
        conversions: conversions ?? 0,
        revenue: revenue ?? 0,
      },
      { onConflict: "utm_entry_id,record_date" }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
