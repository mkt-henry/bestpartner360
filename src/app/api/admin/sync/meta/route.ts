import { NextRequest, NextResponse } from "next/server"
import { isCurrentUserAdmin } from "@/lib/admin-auth"
import { runMetaCampaignSync } from "@/lib/ad-platform-sync/service"
import { createAdminClient } from "@/lib/supabase/admin"

function parseBrandIds(value: string | null): string[] | undefined {
  if (!value) return undefined
  const ids = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  return ids.length > 0 ? ids : undefined
}

export async function GET(req: NextRequest) {
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const brandIds = parseBrandIds(req.nextUrl.searchParams.get("brandIds"))
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "20")))
  const supabase = createAdminClient()

  let query = supabase
    .from("sync_runs")
    .select("id, platform, brand_id, account_ref, status, started_at, finished_at, summary, error_message")
    .eq("platform", "meta")
    .order("started_at", { ascending: false })
    .limit(limit)

  if (brandIds && brandIds.length > 0) {
    query = query.in("brand_id", brandIds)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ runs: data ?? [] })
}

export async function POST(req: NextRequest) {
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { brandIds?: string[]; since?: string; until?: string } = {}
  try {
    body = await req.json()
  } catch {}

  if (body.brandIds && !Array.isArray(body.brandIds)) {
    return NextResponse.json({ error: "brandIds must be an array" }, { status: 400 })
  }

  if (body.since && !/^\d{4}-\d{2}-\d{2}$/.test(body.since)) {
    return NextResponse.json({ error: "since must be YYYY-MM-DD" }, { status: 400 })
  }

  if (body.until && !/^\d{4}-\d{2}-\d{2}$/.test(body.until)) {
    return NextResponse.json({ error: "until must be YYYY-MM-DD" }, { status: 400 })
  }

  try {
    const result = await runMetaCampaignSync({
      brandIds: body.brandIds,
      since: body.since,
      until: body.until,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
