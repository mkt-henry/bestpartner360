import { NextRequest, NextResponse } from "next/server"
import { evaluateAlerts } from "@/lib/alert-evaluator"

export const dynamic = "force-dynamic"

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // if not set, allow (dev)
  const header = req.headers.get("authorization")
  if (header === `Bearer ${secret}`) return true
  // Vercel Cron uses ?key= or Authorization
  const key = req.nextUrl.searchParams.get("key")
  return key === secret
}

async function run(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  try {
    const result = await evaluateAlerts()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    )
  }
}

export const GET = run
export const POST = run
