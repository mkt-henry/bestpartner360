import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("platform_credentials")
    .select("platform, credentials, updated_at")
    .order("platform")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 키 값을 마스킹해서 반환
  const masked = (data ?? []).map((row) => ({
    platform: row.platform,
    updated_at: row.updated_at,
    has_credentials: Object.values(row.credentials as Record<string, string>).some((v) => v.length > 0),
    fields: Object.fromEntries(
      Object.entries(row.credentials as Record<string, string>).map(([k, v]) => [
        k,
        v ? `${v.slice(0, 4)}${"*".repeat(Math.min(v.length - 4, 20))}` : "",
      ])
    ),
  }))

  return NextResponse.json({ credentials: masked })
}

export async function POST(req: NextRequest) {
  const { platform, credentials } = await req.json()

  if (!platform || !credentials) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  if (!["meta", "naver"].includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from("platform_credentials").upsert(
    { platform, credentials, updated_at: new Date().toISOString() },
    { onConflict: "platform" }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { platform } = await req.json()

  if (!platform) {
    return NextResponse.json({ error: "Missing platform" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("platform_credentials")
    .delete()
    .eq("platform", platform)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
