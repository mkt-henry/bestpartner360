import { NextResponse } from "next/server"
import { fetchGscSites } from "@/lib/gsc-insights"

export const dynamic = "force-dynamic"

export async function GET() {
  const res = await fetchGscSites()
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: 500 })
  }
  return NextResponse.json({ sites: res.sites })
}
