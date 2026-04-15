import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runGa4Realtime } from "@/lib/ga4-insights"

export const dynamic = "force-dynamic"

export async function GET() {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandIdsHeader = h.get("x-user-brand-ids")

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []
  if (brandIds.length === 0) {
    return NextResponse.json({ error: "no brand" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: props } = await supabase
    .from("ga4_properties")
    .select("property_id, website_url")
    .in("brand_id", brandIds)
    .limit(1)

  const prop = props?.[0]
  if (!prop) {
    return NextResponse.json({ error: "no ga4 property" }, { status: 404 })
  }

  const [activeRes, pagesRes, countryRes, eventsRes, deviceRes] = await Promise.all([
    runGa4Realtime({
      propertyId: prop.property_id,
      dimensions: [],
      metrics: ["activeUsers"],
    }),
    runGa4Realtime({
      propertyId: prop.property_id,
      dimensions: ["unifiedScreenName"],
      metrics: ["activeUsers"],
      limit: 10,
    }),
    runGa4Realtime({
      propertyId: prop.property_id,
      dimensions: ["country"],
      metrics: ["activeUsers"],
      limit: 10,
    }),
    runGa4Realtime({
      propertyId: prop.property_id,
      dimensions: ["eventName"],
      metrics: ["eventCount"],
      limit: 15,
    }),
    runGa4Realtime({
      propertyId: prop.property_id,
      dimensions: ["deviceCategory"],
      metrics: ["activeUsers"],
      limit: 5,
    }),
  ])

  if ("error" in activeRes) {
    return NextResponse.json({ error: activeRes.error }, { status: 500 })
  }

  const activeUsers = Number(activeRes.rows[0]?.metrics[0] ?? 0)

  const toRows = (res: typeof pagesRes) => {
    if ("error" in res) return []
    return res.rows.map((r) => ({
      label: r.dimensions[0] ?? "—",
      value: Number(r.metrics[0] ?? 0),
    }))
  }

  return NextResponse.json({
    propertyId: prop.property_id,
    websiteUrl: prop.website_url,
    activeUsers,
    topPages: toRows(pagesRes),
    countries: toRows(countryRes),
    events: toRows(eventsRes),
    devices: toRows(deviceRes),
    fetchedAt: new Date().toISOString(),
  })
}
