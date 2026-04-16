import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Topbar, FooterBar } from "../_components/Topbar"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function ConsoleSettingsPage() {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandIdsHeader = h.get("x-user-brand-ids")
  const brandName = h.get("x-user-brand-name")
    ? decodeURIComponent(h.get("x-user-brand-name")!)
    : "브랜드"

  if (!userId) redirect("/login")
  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []

  const supabase = await createClient()

  const [brandsRes, metaRes, ga4Res, accessRes] = await Promise.all([
    brandIds.length > 0
      ? supabase.from("brands").select("id, name, logo_url").in("id", brandIds)
      : Promise.resolve({ data: [] }),
    brandIds.length > 0
      ? supabase
          .from("meta_ad_accounts")
          .select("id, meta_account_id, meta_account_name, created_at")
          .in("brand_id", brandIds)
      : Promise.resolve({ data: [] }),
    brandIds.length > 0
      ? supabase
          .from("ga4_properties")
          .select("id, property_id, property_name, website_url, created_at")
          .in("brand_id", brandIds)
      : Promise.resolve({ data: [] }),
    brandIds.length > 0
      ? supabase
          .from("user_brand_access")
          .select("user_id, brand_id, user:user_profiles(id, email, full_name, role)")
          .in("brand_id", brandIds)
      : Promise.resolve({ data: [] }),
  ])

  const brands = (brandsRes.data ?? []) as { id: string; name: string; logo_url: string | null }[]
  const metaAccounts = (metaRes.data ?? []) as {
    id: string
    meta_account_id: string
    meta_account_name: string
    created_at: string
  }[]
  const ga4Properties = (ga4Res.data ?? []) as {
    id: string
    property_id: string
    property_name: string
    website_url: string | null
    created_at: string
  }[]
  const access = (accessRes.data ?? []) as unknown as {
    user_id: string
    brand_id: string
    user: { id: string; email: string; full_name: string | null; role: string }[] | { id: string; email: string; full_name: string | null; role: string } | null
  }[]

  // Deduplicate team by user id
  const teamMap = new Map<string, { email: string; name: string; role: string }>()
  for (const a of access) {
    const u = Array.isArray(a.user) ? a.user[0] : a.user
    if (u && !teamMap.has(u.id)) {
      teamMap.set(u.id, {
        email: u.email,
        name: u.full_name ?? u.email,
        role: u.role,
      })
    }
  }
  const team = Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name))

  const sources = [
    ...metaAccounts.map((a) => ({
      key: `meta-${a.id}`,
      icon: "M",
      bg: "#1877F220",
      color: "#6FA8F5",
      name: "Meta Ads",
      id: `${a.meta_account_name} · ${a.meta_account_id}`,
      connectedAt: a.created_at,
    })),
    ...ga4Properties.map((p) => ({
      key: `ga4-${p.id}`,
      icon: "Ω",
      bg: "#E8B04B20",
      color: "#E8B04B",
      name: "Google Analytics 4",
      id: `${p.property_name} · 속성 ${p.property_id}${p.website_url ? ` · ${p.website_url}` : ""}`,
      connectedAt: p.created_at,
    })),
  ]

  const primaryBrand = brands[0] ?? null
  const config = [
    { label: "워크스페이스 이름", value: primaryBrand?.name ?? brandName },
    { label: "브랜드", value: brands.length > 0 ? brands.map((b) => b.name).join(", ") : "—" },
    { label: "통화", value: "KRW (₩) · (기본값, 브랜드 설정 확장 예정)" },
    { label: "시간대", value: "Asia/Seoul · (기본값)" },
    { label: "어트리뷰션 모델", value: "Data-driven / 7d-click + 1d-view (기본값)" },
    { label: "플랜", value: "— (workspace_settings 확장 예정)" },
  ]

  return (
    <>
      <Topbar
        crumbs={[
          { label: "워크스페이스" },
          { label: brandName },
          { label: "설정", strong: true },
        ]}
      />
      <div className="detail-head">
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic">⚙</span>
              <span>워크스페이스 설정 · {primaryBrand?.name ?? brandName}</span>
            </div>
            <h1>
              워크스페이스 <em>설정</em>
            </h1>
            <div className="dh-meta">
              <span>연결된 소스 {sources.length}개</span>
              <span>·</span>
              <span>팀원 {team.length}명</span>
              <span>·</span>
              <span>브랜드 {brands.length}개</span>
            </div>
          </div>
        </div>
      </div>

      <div className="canvas">
        <div className="two">
          <div className="panel">
            <div className="p-head">
              <h3>연결된 소스</h3>
              <div className="sub">활성 {sources.length}개</div>
            </div>
            <div className="p-body">
              {sources.length === 0 && (
                <div style={{ padding: 16, color: "var(--dim)", fontSize: 11 }}>
                  연결된 소스가 없습니다.
                </div>
              )}
              {sources.map((s) => (
                <div
                  key={s.key}
                  className="geo-row"
                  style={{ gridTemplateColumns: "auto 1fr auto auto" }}
                >
                  <span
                    className="ic"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      background: s.bg,
                      color: s.color,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {s.icon}
                  </span>
                  <span>
                    <div>{s.name}</div>
                    <div style={{ fontSize: 10, color: "var(--dim)" }}>{s.id}</div>
                  </span>
                  <span style={{ color: "var(--good)", fontSize: 10 }}>◉ 연결됨</span>
                  <span style={{ fontSize: 10, color: "var(--dim)" }}>
                    {s.connectedAt.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="p-head">
              <h3>팀</h3>
              <div className="sub">{team.length}명</div>
            </div>
            <div className="p-body">
              {team.length === 0 && (
                <div style={{ padding: 16, color: "var(--dim)", fontSize: 11 }}>
                  팀 멤버가 없습니다.
                </div>
              )}
              {team.map((t) => {
                const initials = t.name
                  .split(/\s+/)
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()
                return (
                  <div
                    key={t.email}
                    className="geo-row"
                    style={{ gridTemplateColumns: "auto 1fr auto" }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg,#7DB8D6,#2a5e7a)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 10,
                        color: "#0A0B0E",
                        fontWeight: 600,
                      }}
                    >
                      {initials}
                    </span>
                    <span>
                      <div>{t.name}</div>
                      <div style={{ fontSize: 10, color: "var(--dim)" }}>{t.email}</div>
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 3,
                        background: "var(--bg-2)",
                        border: "1px solid var(--line)",
                        color: "var(--text-2)",
                      }}
                    >
                      {t.role}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>일반</h3>
            <div className="sub">워크스페이스 설정 정보</div>
          </div>
          <div className="p-body" style={{ fontSize: 12 }}>
            {config.map((c) => (
              <div key={c.label} className="log-row" style={{ gridTemplateColumns: "160px 1fr" }}>
                <div className="who">{c.label}</div>
                <div className="what">{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <FooterBar />
    </>
  )
}
