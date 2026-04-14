import { Topbar, FooterBar } from "../_components/Topbar"

export default function SearchConsolePage() {
  return (
    <>
      <Topbar crumbs={[{ label: "Workspace" }, { label: "Haeundae" }, { label: "Search Console", strong: true }]} />
      <div className="detail-head">
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic" style={{ background: "#5ec27a20", color: "#5EC27A" }}>G</span>
              <span>Google Search Console · haeundae.kr</span>
            </div>
            <h1>Search <em>performance</em></h1>
            <div className="dh-meta">
              <span>Last 28 days</span>
              <span>·</span>
              <span>2,840 keywords tracked</span>
              <span>·</span>
              <span>+14 new in top 10 this week</span>
            </div>
          </div>
          <div className="dh-actions">
            <button className="btn primary">Open in GSC ↗</button>
          </div>
        </div>
      </div>

      <div className="canvas">
        <div className="kpi-row">
          <div className="kpi"><div className="top">Clicks</div><div className="v">48<span className="u">.2k</span></div><div className="d"><span className="chg up">▲ 22%</span> vs prev period</div></div>
          <div className="kpi"><div className="top">Impressions</div><div className="v">1.84<span className="u">M</span></div><div className="d"><span className="chg up">▲ 18%</span> vs prev period</div></div>
          <div className="kpi"><div className="top">Avg CTR</div><div className="v">2.62<span className="u">%</span></div><div className="d"><span className="chg up">▲ 0.3pp</span></div></div>
          <div className="kpi"><div className="top">Avg Position</div><div className="v">14<span className="u">.2</span></div><div className="d"><span className="chg up">▲ 2.8</span> improved</div></div>
          <div className="kpi"><div className="top">Top 3 keywords</div><div className="v">42</div><div className="d"><span className="chg up">▲ 8</span> new this month</div></div>
          <div className="kpi"><div className="top">Indexed pages</div><div className="v">284</div><div className="d">98% coverage</div></div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>Top Queries</h3>
            <div className="sub">By clicks · last 28 days</div>
            <button className="more">···</button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>Query</th>
                  <th className="num">Clicks</th>
                  <th className="num">Impressions</th>
                  <th className="num">CTR</th>
                  <th className="num">Position</th>
                </tr>
              </thead>
              <tbody>
                {QUERIES.map((q) => (
                  <tr key={q.query}>
                    <td><code style={{ background: "var(--bg-2)", padding: "1px 6px", borderRadius: 3, fontSize: 11, border: "1px solid var(--line)", color: "var(--amber)" }}>{q.query}</code></td>
                    <td className="num">{q.clicks}</td>
                    <td className="num">{q.impr}</td>
                    <td className="num" style={q.ctrGood ? { color: "var(--good)" } : undefined}>{q.ctr}</td>
                    <td className="num">{q.pos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>Top Pages</h3>
            <div className="sub">By clicks</div>
            <button className="more">···</button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "50%" }}>Page</th>
                  <th className="num">Clicks</th>
                  <th className="num">Impressions</th>
                  <th className="num">CTR</th>
                  <th className="num">Avg Position</th>
                </tr>
              </thead>
              <tbody>
                {SEO_PAGES.map((p) => (
                  <tr key={p.page}>
                    <td><code style={{ background: "var(--bg-2)", padding: "1px 6px", borderRadius: 3, fontSize: 11, border: "1px solid var(--line)", color: "var(--text-2)" }}>{p.page}</code></td>
                    <td className="num">{p.clicks}</td>
                    <td className="num">{p.impr}</td>
                    <td className="num">{p.ctr}</td>
                    <td className="num">{p.pos}</td>
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

const QUERIES = [
  { query: "해운대 콤부차", clicks: "8,420", impr: "142,800", ctr: "5.9%", ctrGood: true, pos: "2.1" },
  { query: "kombucha korea", clicks: "4,210", impr: "98,420", ctr: "4.3%", ctrGood: true, pos: "4.8" },
  { query: "콤부차 추천", clicks: "3,840", impr: "184,200", ctr: "2.1%", pos: "8.4" },
  { query: "haeundae kombucha", clicks: "2,840", impr: "32,180", ctr: "8.8%", ctrGood: true, pos: "1.4" },
  { query: "발효 음료", clicks: "2,120", impr: "248,400", ctr: "0.9%", pos: "14.2" },
  { query: "콤부차 효능", clicks: "1,840", impr: "312,000", ctr: "0.6%", pos: "18.4" },
  { query: "해운대 선물세트", clicks: "1,420", impr: "28,400", ctr: "5.0%", ctrGood: true, pos: "3.2" },
  { query: "kombucha starter kit", clicks: "984", impr: "42,180", ctr: "2.3%", pos: "6.8" },
]

const SEO_PAGES = [
  { page: "/", clicks: "14,820", impr: "482,000", ctr: "3.1%", pos: "8.4" },
  { page: "/shop/starter-kit", clicks: "8,420", impr: "184,200", ctr: "4.6%", pos: "4.2" },
  { page: "/journal/how-it-made", clicks: "6,840", impr: "248,400", ctr: "2.8%", pos: "6.1" },
  { page: "/shop/craft-edition", clicks: "4,210", impr: "98,400", ctr: "4.3%", pos: "5.8" },
  { page: "/shop/waves", clicks: "3,180", impr: "82,100", ctr: "3.9%", pos: "7.2" },
  { page: "/about", clicks: "2,420", impr: "64,200", ctr: "3.8%", pos: "9.4" },
]
