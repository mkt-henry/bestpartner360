import { NextRequest, NextResponse } from "next/server"
import { fetchTiktokReport, type TiktokDataLevel } from "@/lib/tiktok-insights"

const ALLOWED_LEVELS: TiktokDataLevel[] = [
  "AUCTION_ADVERTISER",
  "AUCTION_CAMPAIGN",
  "AUCTION_ADGROUP",
  "AUCTION_AD",
]

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const advertiserId = searchParams.get("advertiser_id")
  const startDate = searchParams.get("since")
  const endDate = searchParams.get("until")
  const levelParam = (searchParams.get("level") ?? "AUCTION_ADVERTISER") as TiktokDataLevel

  if (!advertiserId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "advertiser_id, since, until 파라미터가 필요합니다." },
      { status: 400 }
    )
  }

  const level = ALLOWED_LEVELS.includes(levelParam) ? levelParam : "AUCTION_ADVERTISER"

  const [summary, daily] = await Promise.all([
    fetchTiktokReport({
      advertiserId,
      startDate,
      endDate,
      dataLevel: level,
    }),
    fetchTiktokReport({
      advertiserId,
      startDate,
      endDate,
      dataLevel: "AUCTION_ADVERTISER",
      extraDimensions: ["stat_time_day"],
    }),
  ])

  if ("error" in summary) {
    return NextResponse.json({ error: summary.error }, { status: 500 })
  }

  return NextResponse.json({
    summary: summary.rows,
    daily: "error" in daily ? [] : daily.rows,
  })
}
