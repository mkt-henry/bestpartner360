import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import Ga4UtmManager from "@/components/admin/Ga4UtmManager"
import type { Brand } from "@/types"

interface PageProps {
  searchParams: Promise<{ brand?: string }>
}

export default async function AdminGa4UtmPage({ searchParams }: PageProps) {
  const { brand: selectedBrandId } = await searchParams
  const supabase = await createClient()

  const { data: brands } = await supabase.from("brands").select("id, name").order("name")
  const activeBrandId = selectedBrandId ?? brands?.[0]?.id ?? ""

  // UTM 항목 + 성과 데이터
  const { data: utmEntries } = await supabase
    .from("ga4_utm_entries")
    .select("*")
    .eq("brand_id", activeBrandId)
    .order("created_at", { ascending: false })

  const entryIds = utmEntries?.map((e) => e.id) ?? []

  const { data: perfData } = entryIds.length > 0
    ? await supabase
        .from("ga4_utm_performance")
        .select("*")
        .in("utm_entry_id", entryIds)
        .order("record_date", { ascending: false })
    : { data: [] }

  const entriesWithPerf = (utmEntries ?? []).map((e) => ({
    ...e,
    performance: (perfData ?? []).filter((p) => p.utm_entry_id === e.id),
  }))

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1>GA4 <em>UTM</em></h1>
          <p className="sub">UTM 파라미터 관리 및 성과 추적</p>
        </div>
      </div>

      {brands && brands.length > 0 ? (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/admin/ga4-utm?brand=${brand.id}`}
                className={brand.id === activeBrandId ? "chip on" : "chip"}
              >
                {brand.name}
              </Link>
            ))}
          </div>

          <Ga4UtmManager
            key={activeBrandId}
            brandId={activeBrandId}
            brands={(brands ?? []) as Brand[]}
            entries={entriesWithPerf}
          />
        </>
      ) : (
        <div className="panel">
          <div className="empty">
            <p>먼저 브랜드를 등록해주세요.</p>
            <Link href="/admin/brands" className="btn" style={{ display: "inline-flex", marginTop: 12 }}>브랜드 관리 →</Link>
          </div>
        </div>
      )}
    </div>
  )
}
