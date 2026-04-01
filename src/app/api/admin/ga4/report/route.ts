import { NextRequest, NextResponse } from "next/server"
import { getGa4Credentials } from "@/lib/credentials"

export async function POST(req: NextRequest) {
  const { propertyId, startDate, endDate } = await req.json()

  if (!propertyId || !startDate || !endDate) {
    return NextResponse.json({ error: "propertyId, startDate, endDate 필수" }, { status: 400 })
  }

  const creds = await getGa4Credentials()
  if (!creds) {
    return NextResponse.json({ error: "GA4 인증 정보가 없습니다" }, { status: 400 })
  }

  try {
    // 페이지별 데이터
    const pageRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "totalUsers" },
            { name: "sessions" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
          ],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 50,
        }),
      }
    )

    if (!pageRes.ok) {
      const err = await pageRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: err?.error?.message ?? `GA4 API 오류 (${pageRes.status})` },
        { status: pageRes.status }
      )
    }

    const pageData = await pageRes.json()

    // 전체 요약
    const summaryRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: "screenPageViews" },
            { name: "totalUsers" },
            { name: "sessions" },
            { name: "newUsers" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
          ],
        }),
      }
    )

    const summaryData = summaryRes.ok ? await summaryRes.json() : null

    // 일별 추이
    const dailyRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "totalUsers" },
            { name: "sessions" },
          ],
          orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
        }),
      }
    )

    const dailyData = dailyRes.ok ? await dailyRes.json() : null

    // 파싱
    const pages = (pageData.rows ?? []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      path: row.dimensionValues[0].value,
      title: row.dimensionValues[1].value,
      pageviews: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
      sessions: parseInt(row.metricValues[2].value),
      avgDuration: parseFloat(row.metricValues[3].value),
      bounceRate: parseFloat(row.metricValues[4].value),
    }))

    const summaryRow = summaryData?.rows?.[0]
    const summary = summaryRow
      ? {
          pageviews: parseInt(summaryRow.metricValues[0].value),
          users: parseInt(summaryRow.metricValues[1].value),
          sessions: parseInt(summaryRow.metricValues[2].value),
          newUsers: parseInt(summaryRow.metricValues[3].value),
          avgDuration: parseFloat(summaryRow.metricValues[4].value),
          bounceRate: parseFloat(summaryRow.metricValues[5].value),
        }
      : null

    const daily = (dailyData?.rows ?? []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      date: row.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"),
      pageviews: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
      sessions: parseInt(row.metricValues[2].value),
    }))

    return NextResponse.json({ pages, summary, daily })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GA4 리포트 조회 실패" },
      { status: 500 }
    )
  }
}
