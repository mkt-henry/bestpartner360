export const dynamic = "force-dynamic"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getGa4Credentials } from "@/lib/credentials"

import Ga4UtmDashboard from "@/components/viewer/Ga4UtmDashboard"
import Ga4Analytics from "@/components/viewer/Ga4Analytics"
import { Topbar, FooterBar } from "@/components/console/Topbar"

export default async function DashboardGa4Page() {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandIdsHeader = h.get("x-user-brand-ids")

  if (!userId) redirect("/login")

  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []

  if (brandIds.length === 0) {
    return (
      <>
        <Topbar crumbs={[{ label: "워크스페이스" }, { label: "GA4", strong: true }]} />
        <div className="canvas">
          <div className="panel">
            <div className="p-body" style={{ padding: 40, textAlign: "center", color: "var(--dim)" }}>
              연결된 브랜드가 없습니다.
            </div>
          </div>
        </div>
      </>
    )
  }

  const supabase = await createClient()

  const [{ data: ga4Properties }, { data: utmEntries }] = await Promise.all([
    supabase
      .from("ga4_properties")
      .select("property_id, property_name, website_url")
      .in("brand_id", brandIds),
    supabase
      .from("ga4_utm_entries")
      .select("*")
      .in("brand_id", brandIds)
      .order("created_at", { ascending: false }),
  ])

  const properties = ga4Properties ?? []
  if (properties.length === 0 && (utmEntries?.length ?? 0) === 0) {
    redirect("/dashboard")
  }

  const missingUrl = properties.filter((p) => !p.website_url)
  if (missingUrl.length > 0) {
    const creds = await getGa4Credentials()
    if (creds) {
      const admin = createAdminClient()
      await Promise.all(
        missingUrl.map(async (p) => {
          try {
            const res = await fetch(
              `https://analyticsadmin.googleapis.com/v1beta/properties/${p.property_id}/dataStreams`,
              { headers: { Authorization: `Bearer ${creds.access_token}` } }
            )
            if (!res.ok) return
            const json = await res.json()
            const webStream = (json.dataStreams ?? []).find(
              (s: { type: string }) => s.type === "WEB_DATA_STREAM"
            )
            const url = webStream?.webStreamData?.defaultUri
            if (url) {
              await admin
                .from("ga4_properties")
                .update({ website_url: url })
                .eq("property_id", p.property_id)
              p.website_url = url
            }
          } catch {
            // ignore
          }
        })
      )
    }
  }

  const entryIds = utmEntries?.map((e) => e.id) ?? []
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const today = now.toISOString().slice(0, 10)

  const { data: perfData } = entryIds.length > 0
    ? await supabase
        .from("ga4_utm_performance")
        .select("*")
        .in("utm_entry_id", entryIds)
        .gte("record_date", monthStart)
        .lte("record_date", today)
        .order("record_date")
    : { data: [] }

  const entriesWithPerf = (utmEntries ?? []).map((e) => ({
    ...e,
    performance: (perfData ?? []).filter((p) => p.utm_entry_id === e.id),
  }))

  const allPerf = perfData ?? []
  const totals = {
    sessions: allPerf.reduce((s, p) => s + p.sessions, 0),
    users: allPerf.reduce((s, p) => s + p.users, 0),
    pageviews: allPerf.reduce((s, p) => s + p.pageviews, 0),
    conversions: allPerf.reduce((s, p) => s + p.conversions, 0),
    revenue: allPerf.reduce((s, p) => s + Number(p.revenue), 0),
  }

  return (
    <>
      <Topbar crumbs={[{ label: "워크스페이스" }, { label: "GA4", strong: true }]} />

      <div className="canvas">
        <div className="page-head">
          <div>
            <h1>GA4 분석</h1>
            <div className="sub">
              {properties.length}개 속성 &nbsp; · &nbsp; {entryIds.length} UTM
            </div>
          </div>
          <div className="pg-actions" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {properties.map((p: { property_id: string; property_name: string; website_url?: string | null }) => (
              <a
                key={p.property_id}
                href={p.website_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="chip"
                style={{ color: "var(--amber)" }}
              >
                ↗ {p.website_url ? p.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "") : p.property_name}
              </a>
            ))}
          </div>
        </div>

        {/* GA4 사이트 분석 */}
        {properties.length > 0 ? (
          <Ga4Analytics properties={properties} />
        ) : (
          <div className="panel">
            <div className="p-body" style={{ color: "var(--dim)", padding: 24, textAlign: "center" }}>
              연결된 GA4 속성이 없습니다. 관리자에게 문의하세요.
            </div>
          </div>
        )}

        {/* UTM 성과 */}
        {entryIds.length > 0 && (
          <Ga4UtmDashboard entries={entriesWithPerf} monthStart={monthStart} today={today} />
        )}
      </div>

      <FooterBar />
    </>
  )
}
