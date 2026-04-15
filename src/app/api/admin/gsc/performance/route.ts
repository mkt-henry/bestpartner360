import { NextRequest, NextResponse } from "next/server"
import { fetchGscPerformance } from "@/lib/gsc-insights"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const { siteUrl, startDate, endDate, dimensions, rowLimit, searchType } = await req.json()

  if (!siteUrl || !startDate || !endDate) {
    return NextResponse.json(
      { error: "siteUrl, startDate, endDate 필수" },
      { status: 400 }
    )
  }

  const res = await fetchGscPerformance({
    siteUrl,
    startDate,
    endDate,
    dimensions,
    rowLimit,
    searchType,
  })
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: 500 })
  }
  return NextResponse.json({ rows: res.rows })
}
