import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  LIVE_MEDIA_PLATFORMS,
  MEDIA_PLATFORMS,
  PLANNED_MEDIA_PLATFORMS,
  type MediaPlatformKey,
} from "@/lib/media-platforms"

type BrandRow = {
  id: string
  name: string
}

type CredentialRow = {
  platform: string
  credentials: Record<string, unknown> | null
  updated_at: string | null
}

type LivePlatformSummary = {
  key: MediaPlatformKey
  label: string
  shortLabel: string
  description: string
  color: string
  totalConnections: number
  connectedBrandCount: number
  credentialReady: boolean
  credentialLabel: string
  managementNote: string
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
}

function isCredentialReady(platform: MediaPlatformKey, credentials?: Record<string, unknown> | null) {
  if (!credentials) return false

  if (platform === "meta") {
    return hasText(credentials.access_token)
  }

  if (platform === "naver") {
    return (
      hasText(credentials.api_key) &&
      hasText(credentials.secret_key) &&
      hasText(credentials.customer_id)
    )
  }

  if (platform === "ga4") {
    return hasText(credentials.refresh_token)
  }

  return false
}

function pct(value: number, total: number) {
  if (total <= 0) return 0
  return Math.round((value / total) * 100)
}

function categoryLabel(category: string) {
  if (category === "ads") return "광고"
  if (category === "analytics") return "분석"
  return "Owned"
}

export default async function AdminChannelsPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const [
    { data: brands },
    { data: metaMappings },
    { data: naverMappings },
    { data: ga4Mappings },
    { data: credentials },
  ] = await Promise.all([
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("meta_ad_accounts").select("brand_id, meta_account_id"),
    supabase.from("naver_ad_accounts").select("brand_id, naver_customer_id"),
    supabase.from("ga4_properties").select("brand_id, property_id"),
    admin.from("platform_credentials").select("platform, credentials, updated_at"),
  ])

  const brandList = (brands ?? []) as BrandRow[]
  const brandTotal = brandList.length
  const credentialMap = new Map(
    ((credentials ?? []) as CredentialRow[]).map((row) => [row.platform, row])
  )

  const metaBrandIds = new Set((metaMappings ?? []).map((row) => row.brand_id as string))
  const naverBrandIds = new Set((naverMappings ?? []).map((row) => row.brand_id as string))
  const ga4BrandIds = new Set((ga4Mappings ?? []).map((row) => row.brand_id as string))

  const connectionSets: Partial<Record<MediaPlatformKey, Set<string>>> = {
    meta: metaBrandIds,
    naver: naverBrandIds,
    ga4: ga4BrandIds,
  }

  const connectionCounts: Partial<Record<MediaPlatformKey, number>> = {
    meta: metaMappings?.length ?? 0,
    naver: naverMappings?.length ?? 0,
    ga4: ga4Mappings?.length ?? 0,
  }

  const liveSummaries: LivePlatformSummary[] = LIVE_MEDIA_PLATFORMS.map((platform) => {
    const credential = credentialMap.get(platform.key)
    const connectedBrandCount = connectionSets[platform.key]?.size ?? 0

    return {
      key: platform.key,
      label: platform.label,
      shortLabel: platform.shortLabel,
      description: platform.description,
      color: platform.color,
      totalConnections: connectionCounts[platform.key] ?? 0,
      connectedBrandCount,
      credentialReady: isCredentialReady(platform.key, credential?.credentials),
      credentialLabel: credential?.updated_at
        ? `마지막 수정 ${new Date(credential.updated_at).toLocaleDateString("ko-KR")}`
        : "자격 증명 없음",
      managementNote:
        platform.key === "ga4"
          ? "Google OAuth 연결 후 브랜드별 속성을 매핑합니다."
          : "공통 API 키를 저장한 뒤 브랜드별 계정을 매핑합니다.",
    }
  })

  const brandsWithAnyConnection = new Set<string>()
  for (const set of Object.values(connectionSets)) {
    for (const brandId of set ?? []) brandsWithAnyConnection.add(brandId)
  }

  const readyCredentialCount = liveSummaries.filter((summary) => summary.credentialReady).length
  const totalConnections = liveSummaries.reduce((sum, item) => sum + item.totalConnections, 0)
  const brandsWithoutConnection = Math.max(0, brandTotal - brandsWithAnyConnection.size)

  const brandCoverage = brandList.map((brand) => {
    const connected = LIVE_MEDIA_PLATFORMS.filter((platform) =>
      connectionSets[platform.key]?.has(brand.id)
    )

    return {
      brand,
      connected,
      missing: LIVE_MEDIA_PLATFORMS.filter(
        (platform) => !connectionSets[platform.key]?.has(brand.id)
      ),
    }
  })

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1>
            매체 <em>연동</em>
          </h1>
          <p className="sub">
            현재 운영 중인 매체와 향후 추가될 매체를 한 곳에서 관리합니다
            <span className="live">{LIVE_MEDIA_PLATFORMS.length}개 운영 매체</span>
          </p>
        </div>
        <div className="pg-actions">
          <Link href="/admin/brands" className="btn">
            브랜드별 연결 관리
          </Link>
          <Link href="/admin/settings" className="btn">
            API 설정
          </Link>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="top">
            <span>운영 매체</span>
          </div>
          <div className="v">{LIVE_MEDIA_PLATFORMS.length}</div>
          <div className="d">
            <span>Meta, Naver, GA4</span>
          </div>
        </div>
        <div className="kpi">
          <div className="top">
            <span>예정 매체</span>
          </div>
          <div className="v">{PLANNED_MEDIA_PLATFORMS.length}</div>
          <div className="d">
            <span>확장 슬롯</span>
          </div>
        </div>
        <div className="kpi">
          <div className="top">
            <span>자격 증명</span>
          </div>
          <div className="v">{readyCredentialCount}/{LIVE_MEDIA_PLATFORMS.length}</div>
          <div className="d">
            <span>공통 인증 준비</span>
          </div>
        </div>
        <div className="kpi">
          <div className="top">
            <span>총 연결</span>
          </div>
          <div className="v">{totalConnections}</div>
          <div className="d">
            <span>계정/속성 매핑</span>
          </div>
        </div>
        <div className="kpi">
          <div className="top">
            <span>연결 브랜드</span>
          </div>
          <div className="v">{brandsWithAnyConnection.size}</div>
          <div className="d">
            <span>하나 이상 연결</span>
          </div>
        </div>
        <div className="kpi">
          <div className="top">
            <span>미연결</span>
          </div>
          <div className="v">{brandsWithoutConnection}</div>
          <div className="d">
            <span>확인 필요 브랜드</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="p-head">
          <h3>운영 매체</h3>
          <span className="sub">공통 인증 상태와 브랜드 커버리지를 확인합니다</span>
        </div>
        <div
          className="p-body"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {liveSummaries.map((summary) => (
            <section
              key={summary.key}
              id={summary.key}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 8,
                background: "var(--bg-2)",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: `${summary.color}20`,
                    color: summary.color,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {summary.shortLabel.slice(0, 1)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h2 style={{ fontSize: 14, color: "var(--text)", fontWeight: 700 }}>
                      {summary.label}
                    </h2>
                    <span className={summary.credentialReady ? "tag good" : "tag warn"}>
                      {summary.credentialReady ? "인증 완료" : "인증 필요"}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--dim)", marginTop: 4, lineHeight: 1.5 }}>
                    {summary.description}
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <MetricBox label="연결" value={`${summary.totalConnections}건`} />
                <MetricBox
                  label="커버리지"
                  value={`${pct(summary.connectedBrandCount, brandTotal)}%`}
                />
              </div>

              <div>
                <div
                  style={{
                    height: 5,
                    borderRadius: 999,
                    background: "var(--line)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct(summary.connectedBrandCount, brandTotal)}%`,
                      height: "100%",
                      background: summary.color,
                    }}
                  />
                </div>
                <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 7 }}>
                  {summary.connectedBrandCount}/{brandTotal} 브랜드 연결
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--line)",
                  paddingTop: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: 11,
                  color: "var(--text-2)",
                }}
              >
                <div>{summary.credentialLabel}</div>
                <div style={{ color: "var(--dim)", lineHeight: 1.5 }}>{summary.managementNote}</div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: "auto", flexWrap: "wrap" }}>
                <Link href="/admin/brands" className="btn primary">
                  브랜드 매핑
                </Link>
                <Link href="/admin/settings" className="btn">
                  인증 설정
                </Link>
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="two">
        <div className="panel">
          <div className="p-head">
            <h3>브랜드별 커버리지</h3>
            <span className="sub">매체가 늘어나도 같은 표에서 누락을 확인합니다</span>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>브랜드</th>
                  <th>연결 매체</th>
                  <th>누락</th>
                  <th className="num">진행률</th>
                </tr>
              </thead>
              <tbody>
                {brandCoverage.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--dim)" }}>
                      등록된 브랜드가 없습니다.
                    </td>
                  </tr>
                ) : (
                  brandCoverage.map(({ brand, connected, missing }) => (
                    <tr key={brand.id}>
                      <td>
                        <div className="cell-main">{brand.name}</div>
                      </td>
                      <td>
                        <PlatformTags platforms={connected} emptyLabel="없음" />
                      </td>
                      <td>
                        <PlatformTags platforms={missing} emptyLabel="없음" muted />
                      </td>
                      <td className="num">
                        {connected.length}/{LIVE_MEDIA_PLATFORMS.length}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>추가 예정 매체</h3>
            <span className="sub">다음 연동 후보</span>
          </div>
          <div className="p-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PLANNED_MEDIA_PLATFORMS.map((platform) => (
              <div
                key={platform.key}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  background: "var(--bg-2)",
                  padding: 13,
                  display: "grid",
                  gridTemplateColumns: "32px minmax(0, 1fr) auto",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: `${platform.color}18`,
                    color: platform.color,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                  }}
                >
                  {platform.shortLabel.slice(0, 1)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>
                    {platform.label}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 3 }}>
                    {platform.description}
                  </div>
                </div>
                <span className="tag neutral">{categoryLabel(platform.category)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="p-head">
          <h3>매체 카탈로그</h3>
          <span className="sub">{MEDIA_PLATFORMS.length}개 매체 슬롯</span>
        </div>
        <div className="p-body" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {MEDIA_PLATFORMS.map((platform) => (
            <span
              key={platform.key}
              className={platform.status === "live" ? "tag good" : "tag neutral"}
              style={{ fontSize: 10 }}
            >
              {platform.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 7,
        background: "var(--bg-1)",
        padding: "10px 11px",
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: "var(--dim)",
          textTransform: "uppercase",
          letterSpacing: ".1em",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 18, color: "var(--text)", marginTop: 4 }}>{value}</div>
    </div>
  )
}

function PlatformTags({
  platforms,
  emptyLabel,
  muted = false,
}: {
  platforms: typeof LIVE_MEDIA_PLATFORMS
  emptyLabel: string
  muted?: boolean
}) {
  if (platforms.length === 0) {
    return <span style={{ color: "var(--dim)", fontSize: 11 }}>{emptyLabel}</span>
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {platforms.map((platform) => (
        <span
          key={platform.key}
          className={muted ? "tag neutral" : "tag good"}
          style={{ fontSize: 9 }}
        >
          {platform.shortLabel}
        </span>
      ))}
    </div>
  )
}
