export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getGa4Credentials } from "@/lib/credentials"
import { formatNumber, formatCurrency } from "@/lib/utils"
import Ga4UtmDashboard from "@/components/viewer/Ga4UtmDashboard"
import Ga4Analytics from "@/components/viewer/Ga4Analytics"

export default async function AdminViewerGa4Page({
  params,
}: {
  params: Promise<{ brandId: string }>
}) {
  const { brandId } = await params
  const brandIds = [brandId]

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
    <div className="canvas" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{
        fontFamily: 'var(--c-serif)', fontSize: 20, fontWeight: 700,
        color: 'var(--text)', margin: '0 0 24px',
      }}>
        GA4 분석
      </h1>

      {properties.length > 0 ? (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>사이트 분석</h2>
            {properties.map((p: { property_id: string; property_name: string; website_url?: string | null }) => (
              <a
                key={p.property_id}
                href={p.website_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, color: 'var(--amber)', textDecoration: 'none',
                }}
              >
                {p.website_url
                  ? p.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")
                  : p.property_name}
                <span style={{ fontSize: 10 }}>&#8599;</span>
              </a>
            ))}
          </div>
          <Ga4Analytics properties={properties} />
        </div>
      ) : (
        <div className="panel" style={{
          background: 'var(--bg-1)', border: '1px solid var(--line)',
          borderRadius: 8, padding: '48px 20px', textAlign: 'center',
          marginBottom: 32,
        }}>
          <p className="empty">연결된 GA4 속성이 없습니다.</p>
        </div>
      )}

      {entryIds.length > 0 && (
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px' }}>UTM 성과</h2>
          <div className="card-grid cols-5" style={{ marginBottom: 16 }}>
            {[
              { label: "세션", value: formatNumber(totals.sessions) },
              { label: "사용자", value: formatNumber(totals.users) },
              { label: "페이지뷰", value: formatNumber(totals.pageviews) },
              { label: "전환수", value: formatNumber(totals.conversions) },
              { label: "수익", value: formatCurrency(totals.revenue) },
            ].map((card) => (
              <div
                key={card.label}
                className="panel"
                style={{
                  background: 'var(--bg-1)', border: '1px solid var(--line)',
                  borderRadius: 8, padding: 16,
                }}
              >
                <p style={{ fontSize: 11, color: 'var(--dim)', margin: '0 0 4px' }}>{card.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{card.value}</p>
              </div>
            ))}
          </div>
          <Ga4UtmDashboard entries={entriesWithPerf} />
        </div>
      )}
    </div>
  )
}
