import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Topbar, FooterBar } from "../_components/Topbar"
import { createClient } from "@/lib/supabase/server"
import { formatNumber } from "@/lib/utils"
import { fetchGscSites, fetchGscPerformance } from "@/lib/gsc-insights"

export const dynamic = "force-dynamic"

function daysAgoISO(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function hostFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

function hostFromSite(siteUrl: string): string | null {
  if (siteUrl.startsWith("sc-domain:")) return siteUrl.replace("sc-domain:", "").replace(/^www\./, "")
  return hostFromUrl(siteUrl)
}

function Empty({ brandName, message }: { brandName: string; message: string }) {
  return (
    <>
      <Topbar
        crumbs={[
          { label: "워크스페이스" },
          { label: brandName },
          { label: "Search Console", strong: true },
        ]}
      />
      <div className="canvas">
        <div className="panel">
          <div className="p-body" style={{ padding: 40, textAlign: "center", color: "var(--dim)" }}>
            {message}
          </div>
        </div>
      </div>
      <FooterBar />
    </>
  )
}

export default async function ConsoleSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandIdsHeader = h.get("x-user-brand-ids")
  const brandName = h.get("x-user-brand-name")
    ? decodeURIComponent(h.get("x-user-brand-name")!)
    : "브랜드"

  if (!userId) redirect("/login")
  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []
  const sp = await searchParams
  const rangeDays = Math.min(90, Math.max(1, Number(sp.range) || 28))

  if (brandIds.length === 0) {
    return <Empty brandName={brandName} message="연결된 브랜드가 없습니다." />
  }

  const supabase = await createClient()
  const { data: props } = await supabase
    .from("ga4_properties")
    .select("website_url")
    .in("brand_id", brandIds)
    .limit(1)

  const brandUrl = props?.[0]?.website_url ?? null
  const brandHost = hostFromUrl(brandUrl)

  if (!brandUrl || !brandHost) {
    return (
      <Empty
        brandName={brandName}
        message="브랜드에 연결된 웹사이트 주소가 없어 Search Console 데이터를 표시할 수 없습니다."
      />
    )
  }

  const sitesRes = await fetchGscSites()
  if ("error" in sitesRes) {
    return (
      <Empty
        brandName={brandName}
        message={`GSC API 오류: ${sitesRes.error}. Google OAuth에 webmasters.readonly 스코프 재동의가 필요할 수 있습니다.`}
      />
    )
  }

  if (sitesRes.sites.length === 0) {
    return (
      <Empty
        brandName={brandName}
        message="GSC에 인증된 사이트가 없습니다. Search Console에서 먼저 도메인 소유권을 인증하세요."
      />
    )
  }

  const matchedSite = sitesRes.sites.find((s) => hostFromSite(s.siteUrl) === brandHost)
  if (!matchedSite) {
    return (
      <Empty
        brandName={brandName}
        message="브랜드에 연결된 Search Console 사이트가 없습니다. 관리자에게 문의하세요."
      />
    )
  }

  const siteUrl = matchedSite.siteUrl

  const since = daysAgoISO(rangeDays)
  const until = daysAgoISO(2)
  const prevSince = daysAgoISO(rangeDays * 2)
  const prevUntil = daysAgoISO(rangeDays + 1)

  const [totalsCur, totalsPrev, queryRes, pageRes] = await Promise.all([
    fetchGscPerformance({ siteUrl, startDate: since, endDate: until, dimensions: [] }),
    fetchGscPerformance({ siteUrl, startDate: prevSince, endDate: prevUntil, dimensions: [] }),
    fetchGscPerformance({
      siteUrl,
      startDate: since,
      endDate: until,
      dimensions: ["query"],
      rowLimit: 20,
    }),
    fetchGscPerformance({
      siteUrl,
      startDate: since,
      endDate: until,
      dimensions: ["page"],
      rowLimit: 15,
    }),
  ])

  const totalsRow = "error" in totalsCur ? null : totalsCur.rows[0] ?? null
  const prevRow = "error" in totalsPrev ? null : totalsPrev.rows[0] ?? null
  const queries = "error" in queryRes ? [] : queryRes.rows
  const pages = "error" in pageRes ? [] : pageRes.rows

  const clicks = totalsRow?.clicks ?? 0
  const impressions = totalsRow?.impressions ?? 0
  const ctr = totalsRow ? totalsRow.ctr * 100 : 0
  const position = totalsRow?.position ?? 0
  const prevClicks = prevRow?.clicks ?? 0
  const prevImpressions = prevRow?.impressions ?? 0
  const prevCtr = prevRow ? prevRow.ctr * 100 : 0
  const prevPosition = prevRow?.position ?? 0

  const pct = (c: number, p: number) => {
    if (p === 0) return c === 0 ? 0 : 100
    return ((c - p) / p) * 100
  }
  const fmtDelta = (d: number, suffix = "%") =>
    `${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(1)}${suffix}`

  const top3 = queries.filter((q) => q.position <= 3).length
  const rangeLabel = `${since} — ${until}`

  return (
    <>
      <Topbar
        crumbs={[
          { label: "워크스페이스" },
          { label: brandName },
          { label: "Search Console", strong: true },
        ]}
      />
      <div className="detail-head">
        <Link className="back-link" href="/console">
          ← 개요로 돌아가기
        </Link>
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic" style={{ background: "#5ec27a20", color: "#5EC27A" }}>
                G
              </span>
              <span>Google Search Console · {siteUrl}</span>
            </div>
            <h1>
              검색 <em>성과</em>
            </h1>
            <div className="dh-meta">
              <span className="live-pill">최근 {rangeDays}일</span>
              <span>{rangeLabel}</span>
              <span>·</span>
              <span>
                <b>이전 {rangeDays}일</b> 대비
              </span>
              <span>·</span>
              <span>인증된 사이트 {sitesRes.sites.length}개</span>
            </div>
          </div>
          <div className="dh-actions">
            <a
              className="btn primary"
              href={`https://search.google.com/search-console?resource_id=${encodeURIComponent(siteUrl)}`}
              target="_blank"
              rel="noreferrer"
            >
              GSC에서 열기 ↗
            </a>
          </div>
        </div>
      </div>

      <div className="canvas">
        <div className="kpi-row">
          <div className="kpi">
            <div className="top">클릭</div>
            <div className="v">{formatNumber(clicks)}</div>
            <div className="d">
              <span className={`chg ${clicks >= prevClicks ? "up" : "dn"}`}>
                {fmtDelta(pct(clicks, prevClicks))}
              </span>
              <span>이전 {formatNumber(prevClicks)}</span>
            </div>
          </div>
          <div className="kpi">
            <div className="top">노출</div>
            <div className="v">{formatNumber(impressions)}</div>
            <div className="d">
              <span className={`chg ${impressions >= prevImpressions ? "up" : "dn"}`}>
                {fmtDelta(pct(impressions, prevImpressions))}
              </span>
              <span>이전 {formatNumber(prevImpressions)}</span>
            </div>
          </div>
          <div className="kpi">
            <div className="top">평균 CTR</div>
            <div className="v">
              {ctr.toFixed(2)}
              <span className="u">%</span>
            </div>
            <div className="d">
              <span className={`chg ${ctr >= prevCtr ? "up" : "dn"}`}>
                {fmtDelta(ctr - prevCtr, "pp")}
              </span>
              <span>이전 {prevCtr.toFixed(2)}%</span>
            </div>
          </div>
          <div className="kpi">
            <div className="top">평균 순위</div>
            <div className="v">{position > 0 ? position.toFixed(1) : "—"}</div>
            <div className="d">
              <span className={`chg ${position <= prevPosition && position > 0 ? "up" : "dn"}`}>
                {fmtDelta(position - prevPosition, "")}
              </span>
              <span>이전 {prevPosition > 0 ? prevPosition.toFixed(1) : "—"}</span>
            </div>
          </div>
          <div className="kpi">
            <div className="top">상위 3위 검색어</div>
            <div className="v">{top3}</div>
            <div className="d">상위 검색어 {queries.length}개 중</div>
          </div>
          <div className="kpi">
            <div className="top">집계된 페이지</div>
            <div className="v">{pages.length}</div>
            <div className="d">상위 페이지 {pages.length}개</div>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>상위 검색어</h3>
            <div className="sub">검색어 {queries.length}개 · 클릭 기준 · 최근 28일</div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>검색어</th>
                  <th className="num">클릭</th>
                  <th className="num">노출</th>
                  <th className="num">CTR</th>
                  <th className="num">순위</th>
                </tr>
              </thead>
              <tbody>
                {queries.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--dim)" }}>
                      데이터 없음
                    </td>
                  </tr>
                )}
                {queries.map((q) => (
                  <tr key={q.keys[0]}>
                    <td>
                      <code
                        style={{
                          background: "var(--bg-2)",
                          padding: "1px 6px",
                          borderRadius: 3,
                          fontSize: 11,
                          border: "1px solid var(--line)",
                          color: "var(--amber)",
                        }}
                      >
                        {q.keys[0]}
                      </code>
                    </td>
                    <td className="num">{formatNumber(q.clicks)}</td>
                    <td className="num">{formatNumber(q.impressions)}</td>
                    <td
                      className="num"
                      style={q.ctr >= 0.05 ? { color: "var(--good)" } : undefined}
                    >
                      {(q.ctr * 100).toFixed(1)}%
                    </td>
                    <td className="num">{q.position.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>상위 페이지</h3>
            <div className="sub">페이지 {pages.length}개 · 클릭 기준</div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "50%" }}>페이지</th>
                  <th className="num">클릭</th>
                  <th className="num">노출</th>
                  <th className="num">CTR</th>
                  <th className="num">평균 순위</th>
                </tr>
              </thead>
              <tbody>
                {pages.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--dim)" }}>
                      데이터 없음
                    </td>
                  </tr>
                )}
                {pages.map((p) => (
                  <tr key={p.keys[0]}>
                    <td>
                      <code
                        style={{
                          background: "var(--bg-2)",
                          padding: "1px 6px",
                          borderRadius: 3,
                          fontSize: 11,
                          border: "1px solid var(--line)",
                          color: "var(--text-2)",
                        }}
                      >
                        {p.keys[0]}
                      </code>
                    </td>
                    <td className="num">{formatNumber(p.clicks)}</td>
                    <td className="num">{formatNumber(p.impressions)}</td>
                    <td className="num">{(p.ctr * 100).toFixed(1)}%</td>
                    <td className="num">{p.position.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <FooterBar />
    </>
  )
}
