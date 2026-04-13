import { Topbar, FooterBar } from "../_components/Topbar"
import { TabGroup } from "../_components/TabGroup"
import { RealtimePanel } from "./RealtimePanel"
import { UserExplorer } from "./UserExplorer"

export default function GA4Page() {
  return (
    <>
      <Topbar
        crumbs={[
          { label: "Workspace" },
          { label: "Haeundae" },
          { label: "GA4 Analytics", strong: true },
        ]}
        alerts={0}
        compare="Previous period"
      />

      <div className="detail-head">
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic">Ω</span>
              <span>Google Analytics 4 · haeundae.kr · Property G-XK2N8P</span>
            </div>
            <h1>
              Audience &amp; <em>journeys</em>
            </h1>
            <div className="dh-meta">
              <span className="live-pill">Live · streaming</span>
              <span>Apr 1 — Apr 13, 2026</span>
              <span>·</span>
              <span>Compared vs <b>previous period</b></span>
              <span>·</span>
              <span>Attribution · <b>Data-driven</b> / 7d-click + 1d-view</span>
            </div>
          </div>
          <div className="dh-actions">
            <button className="btn">＋ Segment</button>
            <button className="btn">⇄ Compare</button>
            <button className="btn primary">Open in GA4 ↗</button>
          </div>
        </div>
      </div>

      <div className="drill-tabs">
        <a className="on" href="#">Overview</a>
        <a href="#">Acquisition</a>
        <a href="#">Engagement <span className="c">12</span></a>
        <a href="#">Conversions <span className="c">6</span></a>
        <a href="#">Retention</a>
        <a href="#">User Explorer</a>
        <a href="#">Reports</a>
      </div>

      <div className="canvas">
        <div className="kpi-row">
          {KPIS.map((k) => (
            <div key={k.label} className="kpi">
              <div className="top">{k.label}</div>
              <div className="v">
                {k.v}
                <span className="u">{k.u}</span>
              </div>
              <div className="d">
                <span className={`chg ${k.dir}`}>{k.chg}</span> {k.vs}
              </div>
              <div className="spark">
                <svg viewBox="0 0 100 22" preserveAspectRatio="none">
                  <path d={k.spark} fill="none" stroke={k.color} strokeWidth="1.2" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        <div className="two-70">
          <RealtimePanel />

          <div className="panel">
            <div className="p-head">
              <h3>Acquisition</h3>
              <div className="sub">By source</div>
              <TabGroup tabs={["Users", "Revenue"]} initial="Users" />
            </div>
            <div className="p-body">
              {ACQ.map((a) => (
                <div key={a.label} className="acq-grid">
                  <div className="src">
                    <div className={`ic ${a.ic}`}>{a.icLabel}</div>
                    {a.label}
                  </div>
                  <div className="barmini">
                    <b style={{ width: `${a.w}%` }} />
                  </div>
                  <span className="v">{a.users}</span>
                  <span className="pct">{a.pct}</span>
                  <span className="roas" style={a.roasColor ? { color: a.roasColor } : undefined}>
                    {a.roas}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>Landing Pages</h3>
            <div className="sub">Top 8 by sessions · CVR benchmarked</div>
            <TabGroup tabs={["All", "Paid", "Organic", "Email"]} initial="All" />
            <button className="more">···</button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "38%" }}>Landing Page</th>
                  <th className="num">Sessions <span className="ar">↓</span></th>
                  <th className="num">Users</th>
                  <th className="num">Engage rate</th>
                  <th className="num">Avg time</th>
                  <th className="num">CVR</th>
                  <th className="num">Revenue</th>
                  <th className="num">Rev / session</th>
                </tr>
              </thead>
              <tbody>
                {LANDING.map((l) => (
                  <tr key={l.path}>
                    <td>
                      <div className="cell-main">
                        <div className="url">
                          <code>{l.path}</code>
                          {l.label}
                        </div>
                      </div>
                      <div className="cell-sub" style={{ marginLeft: 34 }}>{l.sub}</div>
                    </td>
                    <td className="num">{l.sessions}</td>
                    <td className="num">{l.users}</td>
                    <td className="num">
                      {l.engage}{" "}
                      <span className="hbar">
                        <b className={l.engageHot ? "hot" : ""} style={{ width: `${l.engageW}%` }} />
                      </span>
                    </td>
                    <td className="num">{l.time}</td>
                    <td className="num" style={l.cvrColor ? { color: l.cvrColor } : undefined}>
                      {l.cvr}
                    </td>
                    <td className="num">{l.rev}</td>
                    <td className="num">{l.rps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>Purchase Funnel</h3>
            <div className="sub">Home → Product → Cart → Checkout → Purchase</div>
            <TabGroup tabs={["All users", "First-time", "Returning"]} initial="All users" />
          </div>
          <div className="p-body">
            <div className="funnel-viz">
              {FUNNEL.map((f) => (
                <div key={f.label} className="fn-step">
                  <div
                    className="step-bar"
                    style={{ ["--w" as string]: `${f.w}%` } as React.CSSProperties}
                  >
                    <span className="lbl">
                      <span className="n">{f.n}</span>
                      <span className="t">{f.label}</span>
                    </span>
                  </div>
                  <span className={`pct ${f.tone ?? ""}`}>
                    {f.pct} <b>{f.drop}</b>
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--amber)",
                marginTop: 14,
                padding: "10px 12px",
                background: "#e8b04b0a",
                border: "1px solid #e8b04b30",
                borderRadius: 6,
              }}
            >
              ◉ Biggest drop · <b>Product view → Add to cart (79.6%)</b> — possible PDP optimization opportunity
            </div>
          </div>
        </div>

        <UserExplorer />

        <div className="three">
          <div className="panel">
            <div className="p-head">
              <h3>Events Stream</h3>
              <div className="sub">Live · last 5 min</div>
              <button className="more">···</button>
            </div>
            <div className="p-body" style={{ padding: 0 }}>
              <div className="events-list">
                {EVENTS.map((e, i) => (
                  <div key={i} className={`ev ${e.kind ?? ""}`}>
                    <span className="pd" />
                    <span className="name" dangerouslySetInnerHTML={{ __html: e.name }} />
                    <span className="count">{e.count}</span>
                    <span className="t">{e.t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="p-head">
              <h3>Top Regions</h3>
              <div className="sub">By users</div>
              <button className="more">···</button>
            </div>
            <div className="p-body">
              {REGIONS.map((r) => (
                <div key={r.city} className="geo-row">
                  <span className="flag">{r.flag}</span>
                  <span>{r.city}</span>
                  <span>
                    <b className="v">{r.v}</b>
                    <span className="pct">{r.pct}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="p-head">
              <h3>Tech &amp; Device</h3>
              <div className="sub">Session share</div>
              <button className="more">···</button>
            </div>
            <div className="p-body">
              <div
                style={{
                  fontSize: 10,
                  color: "var(--dim)",
                  textTransform: "uppercase",
                  letterSpacing: ".12em",
                  marginBottom: 8,
                }}
              >
                Device
              </div>
              <div className="geo-row"><span>📱</span><span>Mobile</span><span><b className="v">83.0%</b><span className="pct" style={{ marginLeft: 6 }}>342k</span></span></div>
              <div className="geo-row"><span>💻</span><span>Desktop</span><span><b className="v">15.4%</b><span className="pct" style={{ marginLeft: 6 }}>63k</span></span></div>
              <div className="geo-row"><span>◻️</span><span>Tablet</span><span><b className="v">1.6%</b><span className="pct" style={{ marginLeft: 6 }}>7k</span></span></div>

              <div
                style={{
                  fontSize: 10,
                  color: "var(--dim)",
                  textTransform: "uppercase",
                  letterSpacing: ".12em",
                  margin: "18px 0 8px",
                }}
              >
                Browser
              </div>
              <div className="geo-row"><span>◉</span><span>Safari iOS</span><span><b className="v">48.2%</b></span></div>
              <div className="geo-row"><span>◉</span><span>Chrome Android</span><span><b className="v">24.8%</b></span></div>
              <div className="geo-row"><span>◉</span><span>Chrome Desktop</span><span><b className="v">12.1%</b></span></div>
              <div className="geo-row"><span>◉</span><span>Samsung Internet</span><span><b className="v">8.4%</b></span></div>
              <div className="geo-row"><span>◉</span><span>Naver Whale</span><span><b className="v">6.5%</b></span></div>
            </div>
          </div>
        </div>
      </div>

      <FooterBar />
    </>
  )
}

const KPIS = [
  { label: "Active Users", v: "284", u: "k", chg: "▲ 22%", dir: "up", vs: "vs 232k", color: "#7DB8D6", spark: "M0,16 L14,14 28,12 42,14 56,10 70,8 84,6 100,4" },
  { label: "Sessions", v: "412", u: "k", chg: "▲ 38%", dir: "up", vs: "1.45/user", color: "#7DB8D6", spark: "M0,20 L14,18 28,14 42,12 56,10 70,6 84,4 100,2" },
  { label: "Engagement rate", v: "64.8", u: "%", chg: "▲ 2.1pp", dir: "up", vs: "benchmark 58%", color: "#5EC27A", spark: "M0,10 L14,12 28,8 42,10 56,6 70,8 84,4 100,6" },
  { label: "Avg session", v: "2", u: ":42", chg: "▲ 14s", dir: "up", vs: "3.2 events/sess", color: "#7DB8D6", spark: "M0,14 L14,12 28,14 42,10 56,8 70,10 84,6 100,8" },
  { label: "Conversions", v: "15", u: ",829", chg: "▲ 29%", dir: "up", vs: "CVR 3.84%", color: "#5EC27A", spark: "M0,18 L14,14 28,16 42,10 56,12 70,6 84,8 100,4" },
  { label: "Revenue", v: "₩184", u: ".2M", chg: "▲ 24.8%", dir: "up", vs: "AOV ₩11,634", color: "#E8B04B", spark: "M0,18 L14,14 28,10 42,12 56,6 70,8 84,4 100,2" },
]

const ACQ = [
  { label: "Google / organic", ic: "ggl", icLabel: "G", w: 84, users: "98,420", pct: "34%", roas: "∞", roasColor: "var(--good)" },
  { label: "Meta / paid", ic: "fb", icLabel: "M", w: 62, users: "72,140", pct: "25%", roas: "4.98×", roasColor: "var(--good)" },
  { label: "Naver / organic", ic: "nv", icLabel: "N", w: 38, users: "44,210", pct: "15%", roas: "∞", roasColor: "var(--good)" },
  { label: "Email / CRM", ic: "em", icLabel: "E", w: 28, users: "32,080", pct: "11%", roas: "46.7×", roasColor: "var(--good)" },
  { label: "Instagram / social", ic: "ig", icLabel: "I", w: 20, users: "22,940", pct: "8%", roas: "—" },
  { label: "Direct", ic: "dir", icLabel: "D", w: 16, users: "18,610", pct: "6%", roas: "—" },
  { label: "Referral", ic: "ref", icLabel: "R", w: 6, users: "3,100", pct: "1%", roas: "—" },
]

const LANDING = [
  { path: "/", label: "Home · Morning Ritual hero", sub: "Primary landing · all paid traffic", sessions: "142,840", users: "98,220", engage: "72.4%", engageW: 88, engageHot: true, time: "2:58", cvr: "4.84%", cvrColor: "var(--good)", rev: "₩62.4M", rps: "₩437" },
  { path: "/shop/starter-kit", label: "", sub: "6-bottle starter kit PDP", sessions: "64,220", users: "48,180", engage: "68.2%", engageW: 82, engageHot: true, time: "3:22", cvr: "8.12%", cvrColor: "var(--good)", rev: "₩42.1M", rps: "₩656" },
  { path: "/journal/how-it-made", label: "", sub: "Editorial · 21-day fermentation", sessions: "48,180", users: "38,490", engage: "82.1%", engageW: 96, engageHot: true, time: "4:18", cvr: "1.84%", rev: "₩9.2M", rps: "₩191" },
  { path: "/shop/craft-edition", label: "", sub: "New release PDP", sessions: "32,840", users: "24,112", engage: "58.4%", engageW: 70, time: "2:14", cvr: "6.24%", cvrColor: "var(--good)", rev: "₩18.4M", rps: "₩560" },
  { path: "/shop/waves", label: "", sub: "Waves collection · 4 flavors", sessions: "28,420", users: "22,108", engage: "54.8%", engageW: 66, time: "1:58", cvr: "3.42%", rev: "₩11.2M", rps: "₩394" },
  { path: "/cart", label: "", sub: "Cart recovery entry · email", sessions: "24,180", users: "18,420", engage: "48.2%", engageW: 58, time: "1:22", cvr: "18.42%", cvrColor: "var(--good)", rev: "₩22.8M", rps: "₩943" },
  { path: "/journal", label: "", sub: "Editorial index", sessions: "18,420", users: "14,210", engage: "38.4%", engageW: 46, time: "0:54", cvr: "0.42%", cvrColor: "var(--bad)", rev: "₩0.8M", rps: "₩43" },
  { path: "/about", label: "", sub: "Brand story", sessions: "12,840", users: "10,180", engage: "42.1%", engageW: 50, time: "1:12", cvr: "1.24%", rev: "₩1.8M", rps: "₩140" },
]

const FUNNEL = [
  { label: "Landing · session_start", n: "412k", w: 100, pct: "100%", drop: "" },
  { label: "Product view · view_item", n: "284k", w: 68.9, pct: "68.9%", drop: "−31.1%" },
  { label: "Add to cart · add_to_cart", n: "58k", w: 14.1, pct: "14.1%", drop: "−79.6%", tone: "bad" },
  { label: "Checkout · begin_checkout", n: "22k", w: 5.3, pct: "5.3%", drop: "−62.1%", tone: "bad" },
  { label: "Purchase · purchase", n: "15k", w: 3.84, pct: "3.84%", drop: "−31.8%", tone: "good" },
]

const EVENTS = [
  { kind: "conv", name: "purchase <b>order_24817</b>", count: "₩68,400", t: "12s" },
  { kind: "eng", name: "add_to_cart <b>MR-6-KR</b>", count: "₩68,400", t: "38s" },
  { kind: "", name: "page_view <b>/shop/starter-kit</b>", count: "—", t: "41s" },
  { kind: "eng", name: "view_item <b>MR-6-KR</b>", count: "₩68,400", t: "52s" },
  { kind: "", name: "session_start", count: "—", t: "54s" },
  { kind: "", name: "scroll <b>75%</b>", count: "—", t: "1m 04s" },
  { kind: "conv", name: "purchase <b>order_24816</b>", count: "₩142,800", t: "1m 18s" },
  { kind: "eng", name: "begin_checkout", count: "₩142,800", t: "1m 32s" },
  { kind: "", name: "page_view <b>/cart</b>", count: "—", t: "1m 48s" },
  { kind: "eng", name: "add_to_cart <b>CR-4-KR</b>", count: "₩92,000", t: "2m 04s" },
  { kind: "", name: "page_view <b>/</b>", count: "—", t: "2m 12s" },
  { kind: "conv", name: "purchase <b>order_24815</b>", count: "₩94,200", t: "2m 28s" },
]

const REGIONS = [
  { flag: "🇰🇷", city: "Seoul", v: "112,840", pct: "40%" },
  { flag: "🇰🇷", city: "Busan", v: "58,420", pct: "21%" },
  { flag: "🇰🇷", city: "Incheon", v: "34,180", pct: "12%" },
  { flag: "🇯🇵", city: "Tokyo", v: "28,420", pct: "10%" },
  { flag: "🇰🇷", city: "Daegu", v: "18,140", pct: "6%" },
  { flag: "🇰🇷", city: "Daejeon", v: "12,220", pct: "4%" },
  { flag: "🇯🇵", city: "Osaka", v: "10,810", pct: "4%" },
  { flag: "🇺🇸", city: "Los Angeles", v: "6,240", pct: "2%" },
  { flag: "🇸🇬", city: "Singapore", v: "2,840", pct: "1%" },
]
