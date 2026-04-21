import { createAdminClient } from "@/lib/supabase/admin"
import { getAllProviders } from "@/lib/providers/registry"
import PlatformCredentialsForm, {
  type CredentialPlatform,
} from "@/components/admin/PlatformCredentialsForm"

export const dynamic = "force-dynamic"

export default async function AdminConnectionsPage() {
  const providers = getAllProviders()

  // Parallel: credential presence + mapping count for each provider.
  const supabase = createAdminClient()
  const rows = await Promise.all(
    providers.map(async (p) => {
      const [connected, { count }] = await Promise.all([
        p.hasCredentials(),
        supabase.from(p.mapping.table).select("id", { count: "exact", head: true }),
      ])
      return { provider: p, connected, mappingCount: count ?? 0 }
    })
  )

  const connectedCount = rows.filter((r) => r.connected).length
  const totalMappings = rows.reduce((sum, r) => sum + r.mappingCount, 0)

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1>
            매체 <em>연결</em>
          </h1>
          <p className="sub">
            광고 플랫폼과 분석 도구의 API 자격증명을 관리합니다. 브랜드별 매핑은 브랜드 관리 화면에서 설정하세요.
            <span className="live">
              {connectedCount}/{providers.length} 연결됨
            </span>
          </p>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="top">
            <span>매체 수</span>
          </div>
          <div className="v">{providers.length}</div>
          <div className="d">
            <span>등록된 플랫폼</span>
          </div>
        </div>
        <div className="kpi">
          <div className="top">
            <span>연결 완료</span>
          </div>
          <div className="v">{connectedCount}</div>
          <div className="d">
            <span>자격증명이 저장된 플랫폼</span>
          </div>
        </div>
        <div className="kpi">
          <div className="top">
            <span>총 매핑 수</span>
          </div>
          <div className="v">{totalMappings}</div>
          <div className="d">
            <span>계정 및 속성 연결 합계</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {rows.map(({ provider, connected, mappingCount }) => (
          <div key={provider.id} className="panel">
            <div
              className="p-head"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
            >
              <div>
                <h3>
                  {provider.label}
                  <span
                    className="sub"
                    style={{
                      marginLeft: 10,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "var(--bg-2)",
                      fontSize: 10,
                    }}
                  >
                    {provider.category === "ads" ? "광고" : "분석"}
                  </span>
                </h3>
                <p style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>
                  {provider.description}
                </p>
                <p style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>
                  {mappingCount > 0 ? `${mappingCount}개 브랜드 매핑` : "브랜드 매핑 없음"}
                </p>
              </div>
              {connected ? (
                <span className="status-pill">연결됨</span>
              ) : (
                <span className="status-pill" style={{ opacity: 0.6 }}>
                  설정 필요
                </span>
              )}
            </div>
            <div className="p-body">
              {provider.authMode === "oauth" ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.6 }}>
                    {connected
                      ? "Google 계정이 연결되어 있습니다. 각 브랜드에서 GA4 속성을 선택할 수 있습니다."
                      : "Google 계정을 연결해야 브랜드별 GA4 속성을 불러올 수 있습니다."}
                  </div>
                  <a href="/api/admin/ga4/auth" className="btn primary">
                    {connected ? "다시 연결" : "계정 연결"}
                  </a>
                </div>
              ) : (
                <PlatformCredentialsForm platforms={[provider.id as CredentialPlatform]} flat />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
