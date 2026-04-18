import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import BrandForm from "@/components/admin/BrandForm"
import BrandChannelManager from "@/components/admin/BrandChannelManager"
import Ga4ConnectButton from "@/components/admin/Ga4ConnectButton"
import type { Brand, MetaAdAccount, NaverAdAccount, Ga4Property } from "@/types"

export default async function AdminBrandsPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const [
    { data: brands },
    { data: metaMappings },
    { data: naverMappings },
    { data: ga4Mappings },
    { data: ga4Cred },
  ] = await Promise.all([
    supabase.from("brands").select("id, name, created_at").order("name"),
    supabase.from("meta_ad_accounts").select("*, brand:brands(id, name)").order("created_at", { ascending: false }),
    supabase.from("naver_ad_accounts").select("*, brand:brands(id, name)").order("created_at", { ascending: false }),
    supabase.from("ga4_properties").select("*, brand:brands(id, name)").order("created_at", { ascending: false }),
    adminSupabase.from("platform_credentials").select("credentials").eq("platform", "ga4").single(),
  ])

  const brandList = (brands ?? []) as Brand[]
  const metaList = (metaMappings ?? []) as MetaAdAccount[]
  const naverList = (naverMappings ?? []) as NaverAdAccount[]
  const ga4List = (ga4Mappings ?? []) as Ga4Property[]
  const ga4Connected = !!ga4Cred?.credentials?.refresh_token
  const brandSummaries = brandList.map((brand) => {
    const metaCount = metaList.filter((mapping) => mapping.brand_id === brand.id).length
    const naverCount = naverList.filter((mapping) => mapping.brand_id === brand.id).length
    const ga4Count = ga4List.filter((mapping) => mapping.brand_id === brand.id).length
    const connectedMediaCount =
      Number(metaCount > 0) + Number(naverCount > 0) + Number(ga4Count > 0)

    return {
      brandId: brand.id,
      connectedMediaCount,
      totalConnections: metaCount + naverCount + ga4Count,
    }
  })
  const connectedBrands = brandSummaries.filter((item) => item.connectedMediaCount > 0).length
  const partiallyConnectedBrands = brandSummaries.filter(
    (item) => item.connectedMediaCount > 0 && item.connectedMediaCount < 3
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
            <span className="live">
              {brandList.length}개 브랜드
            </span>
          </p>
        </div>
      </div>

      {/* 새 브랜드 추가 */}
      <div className="panel">
        <div className="p-head">
          <h3>새 브랜드 추가</h3>
        </div>
        <div className="p-body">
          <BrandForm />
        </div>
      </div>

      {/* GA4 계정 연결 (전체 공통) */}
      <Ga4ConnectButton connected={ga4Connected} />

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

      {/* 브랜드 목록 */}
      <div className="panel">
        <div className="p-head">
          <h3>브랜드 목록</h3>
          <span className="sub" style={{ marginLeft: 8 }}>{brandList.length}개</span>
          <span className="sub" style={{ marginLeft: "auto" }}>
            브랜드를 열면 매체별 연결 상태와 오류를 한 번에 확인할 수 있습니다
          </span>
        </div>
        <div style={{ padding: 0 }}>
          {brandList.length === 0 ? (
            <div style={{ padding: '40px 18px', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--dim)' }}>등록된 브랜드가 없습니다.</p>
            </div>
          ) : (
            brandList.map((brand, i) => (
              <BrandChannelManager
                key={brand.id}
                brand={brand}
                metaMappings={metaList.filter((m) => m.brand_id === brand.id)}
                naverMappings={naverList.filter((m) => m.brand_id === brand.id)}
                ga4Mappings={ga4List.filter((m) => m.brand_id === brand.id)}
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
