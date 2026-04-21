import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import BrandForm from "@/components/admin/BrandForm"
import BrandChannelManager, {
  type BrandProviderMapping,
} from "@/components/admin/BrandChannelManager"
import { PROVIDER_METADATA } from "@/lib/providers/public"
import type { ProviderId } from "@/lib/providers/types"
import type { Brand } from "@/types"

export const dynamic = "force-dynamic"

// Every provider's mapping table carries brand_id plus its own id/name columns.
interface RawMapping {
  brand_id: string
  account_id: string
  account_name: string
}

export default async function AdminBrandsPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const [{ data: brands }, ...mappingResults] = await Promise.all([
    supabase.from("brands").select("id, name, created_at").order("name"),
    ...PROVIDER_METADATA.map((p) =>
      supabase.from(p.mapping.table).select("*").order("created_at", { ascending: false })
    ),
  ])

  const { data: ga4Cred } = await adminSupabase
    .from("platform_credentials")
    .select("credentials")
    .eq("platform", "ga4")
    .single()

  const brandList = (brands ?? []) as Brand[]
  const ga4Connected = !!(ga4Cred?.credentials as { refresh_token?: string } | undefined)
    ?.refresh_token

  const mediaTotal = PROVIDER_METADATA.length

  // Normalize each provider's rows into RawMapping (brand_id + generic id/name).
  const allMappings: Record<ProviderId, RawMapping[]> = {} as Record<ProviderId, RawMapping[]>
  PROVIDER_METADATA.forEach((p, i) => {
    const rows = (mappingResults[i]?.data ?? []) as Array<Record<string, unknown>>
    allMappings[p.id] = rows.map((row) => ({
      brand_id: String(row.brand_id ?? ""),
      account_id: String(row[p.mapping.accountIdColumn] ?? ""),
      account_name: String(row[p.mapping.accountNameColumn] ?? ""),
    }))
  })

  function mappingsForBrand(brandId: string): Record<ProviderId, BrandProviderMapping[]> {
    const out = {} as Record<ProviderId, BrandProviderMapping[]>
    for (const p of PROVIDER_METADATA) {
      out[p.id] = allMappings[p.id]
        .filter((m) => m.brand_id === brandId)
        .map((m) => ({
          providerId: p.id,
          account_id: m.account_id,
          account_name: m.account_name,
        }))
    }
    return out
  }

  const brandSummaries = brandList.map((brand) => {
    let connectedMediaCount = 0
    let totalConnections = 0
    for (const p of PROVIDER_METADATA) {
      const forBrand = allMappings[p.id].filter((m) => m.brand_id === brand.id)
      if (forBrand.length > 0) connectedMediaCount += 1
      totalConnections += forBrand.length
    }
    return { brandId: brand.id, connectedMediaCount, totalConnections }
  })
  const connectedBrands = brandSummaries.filter((item) => item.connectedMediaCount > 0).length
  const partiallyConnectedBrands = brandSummaries.filter(
    (item) => item.connectedMediaCount > 0 && item.connectedMediaCount < mediaTotal
  ).length
  const unconnectedBrands = brandSummaries.filter((item) => item.connectedMediaCount === 0).length
  const totalConnections = brandSummaries.reduce((sum, item) => sum + item.totalConnections, 0)

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1>
            브랜드 <em>관리</em>
          </h1>
          <p className="sub">
            브랜드 및 광고 매체 연결 관리
            <span className="live">{brandList.length}개 브랜드</span>
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="p-head">
          <h3>새 브랜드 추가</h3>
        </div>
        <div className="p-body">
          <BrandForm />
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="top">
            <span>브랜드</span>
          </div>
          <div className="v">{brandList.length}</div>
          <div className="d">
            <span>관리 대상 전체 브랜드</span>
          </div>
        </div>
        <div className="kpi">
          <div className="top">
            <span>연결 완료</span>
          </div>
          <div className="v">{connectedBrands}</div>
          <div className="d">
            <span>하나 이상 매체 연결됨</span>
          </div>
        </div>
        <div className="kpi">
          <div className="top">
            <span>부분 연결</span>
          </div>
          <div className="v">{partiallyConnectedBrands}</div>
          <div className="d">
            <span>추가 설정이 필요한 브랜드</span>
          </div>
        </div>
        <div className="kpi">
          <div className="top">
            <span>미연결</span>
          </div>
          <div className="v">{unconnectedBrands}</div>
          <div className="d">
            <span>아직 매체가 없는 브랜드</span>
          </div>
        </div>
        <div className="kpi">
          <div className="top">
            <span>총 연결 수</span>
          </div>
          <div className="v">{totalConnections}</div>
          <div className="d">
            <span>계정 및 속성 매핑 합계</span>
          </div>
        </div>
        <div className="kpi">
          <div className="top">
            <span>GA4 공통 인증</span>
          </div>
          <div className="v">{ga4Connected ? "ON" : "OFF"}</div>
          <div className="d">
            <span>{ga4Connected ? "속성 목록 조회 가능" : "Google 연결 필요"}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="p-head">
          <h3>브랜드 목록</h3>
          <span className="sub" style={{ marginLeft: 8 }}>
            {brandList.length}개
          </span>
          <span className="sub" style={{ marginLeft: "auto" }}>
            브랜드를 열면 매체별 연결 상태와 오류를 한 번에 확인할 수 있습니다
          </span>
        </div>
        <div style={{ padding: 0 }}>
          {brandList.length === 0 ? (
            <div style={{ padding: "40px 18px", textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "var(--dim)" }}>등록된 브랜드가 없습니다.</p>
            </div>
          ) : (
            brandList.map((brand, i) => (
              <BrandChannelManager
                key={brand.id}
                brand={brand}
                mappings={mappingsForBrand(brand.id)}
                ga4Connected={ga4Connected}
                isLast={i === brandList.length - 1}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
