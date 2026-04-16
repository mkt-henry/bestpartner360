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

      {/* 브랜드 목록 */}
      <div className="panel">
        <div className="p-head">
          <h3>브랜드 목록</h3>
          <span className="sub" style={{ marginLeft: 8 }}>{brandList.length}개</span>
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
