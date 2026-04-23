import { NextRequest, NextResponse } from "next/server"
import { runMetaCampaignSync } from "@/lib/ad-platform-sync/service"

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true

  const headerSecret = req.headers.get("x-cron-secret")
  const bearer = req.headers.get("authorization")
  const key = req.nextUrl.searchParams.get("key")

  return headerSecret === secret || bearer === `Bearer ${secret}` || key === secret
}

async function run(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await runMetaCampaignSync()
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const GET = run
export const POST = run
