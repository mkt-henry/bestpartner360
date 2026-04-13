import Link from "next/link"
import { Topbar, FooterBar } from "./_components/Topbar"
import { Filters } from "./_components/Filters"

export default function ConsoleOverviewPage() {
  return (
    <>
      <Topbar
        crumbs={[
          { label: "Workspace" },
          { label: "Haeundae" },
          { label: "Overview", strong: true },
        ]}
      />

      <Filters />

      <div className="canvas">
        <div className="page-head">
          <div>
            <h1>
              Performance <em>overview</em>
            </h1>
            <div className="sub">
              Apr 1 — Apr 13, 2026 &nbsp; · &nbsp; 12 sources connected &nbsp;{" "}
              <span className="live">streaming</span>
            </div>
          </div>
          <div className="pg-actions">
            <button className="btn">＋ New report</button>
            <button className="btn">⇅ Sync now</button>
            <button className="btn primary">Share view ↗</button>
          </div>
        </div>

        <div className="kpi-row">
          {KPIS.map((k) => (
            <div key={k.label} className="kpi">
              <div className="top">
                <span>{k.label}</span>
                <span className="i">ⓘ</span>
              </div>
              <div className="v">
                {k.value}
                <span className="u">{k.unit}</span>
              </div>
              <div className="d">
                <span className={`chg ${k.dir}`}>{k.chg}</span>
                <span>{k.vs}</span>
              </div>
              <div className="spark">
                <svg viewBox="0 0 100 28" preserveAspectRatio="none">
                  <path d={k.spark} fill="none" stroke={k.color} strokeWidth="1.3" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        <div className="grid">
          <div className="panel">
            <div className="p-head">
              <h3>Revenue vs Spend</h3>
              <div className="sub">Apr 1 — Apr 13</div>
              <TabGroup tabs={["Daily", "Hourly", "Weekly"]} initial="Daily" />
              <button className="more">···</button>
            </div>
            <div className="p-body">
              <div className="chart-stat">
                <div className="s">
                  <div className="l">
                    <i style={{ background: "#E8B04B" }} />
                    Revenue
                  </div>
                  <div className="v">₩184.2M</div>
                </div>
                <div className="s">
                  <div className="l">
                    <i style={{ background: "#7DB8D6" }} />
                    Spend
                  </div>
                  <div className="v">₩44.1M</div>
                </div>
                <div className="s">
                  <div className="l">
                    <i style={{ background: "#5EC27A" }} />
                    Margin
                  </div>
                  <div className="v">₩140.1M</div>
                </div>
              </div>
              <div className="chart-wrap">
                <RevSpendChart />
              </div>
            </div>
          </div>

          <div className="panel alerts">
            <div className="p-head">
              <h3>Live activity</h3>
              <div className="sub">Last 24 h</div>
              <button className="more">···</button>
            </div>
            <div className="p-body">
              {ALERTS.map((a, i) => (
                <div key={i} className={`alert ${a.kind}`}>
                  <div className="bullet" />
                  <div className="body">
                    <div className="top">
                      <span className="tag">{a.tag}</span>
                      <span className="time">{a.time}</span>
                    </div>
                    <div className="msg" dangerouslySetInnerHTML={{ __html: a.msg }} />
                    <div className="meta" dangerouslySetInnerHTML={{ __html: a.meta }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>Campaign Performance</h3>
            <div className="sub">24 active · sorted by revenue</div>
            <TabGroup tabs={["All", "Meta", "Google", "TikTok"]} initial="All" />
            <button className="more">···</button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "32%" }}>Campaign</th>
                  <th className="num sortable">Spend</th>
                  <th className="num sortable">
                    Revenue <span className="ar">↓</span>
                  </th>
                  <th className="num sortable">ROAS</th>
                  <th className="num sortable">CAC</th>
                  <th className="num sortable">CTR</th>
                  <th className="num sortable">Conv</th>
                  <th className="num">Pacing</th>
                </tr>
              </thead>
              <tbody>
                {CAMPAIGNS.map((c) => (
                  <tr key={c.name}>
                    <td>
                      {c.href ? (
                        <Link href={c.href} style={{ color: "inherit", textDecoration: "none" }}>
                          <CampaignCell c={c} linked />
                        </Link>
                      ) : (
                        <CampaignCell c={c} />
                      )}
                    </td>
                    <td className="num">{c.spend}</td>
                    <td className="num">
                      {c.revenue} <span className={`delta ${c.deltaDir}`}>{c.delta}</span>
                    </td>
                    <td className="num">{c.roas}</td>
                    <td className="num">{c.cac}</td>
                    <td className="num">{c.ctr}</td>
                    <td className="num">{c.conv}</td>
                    <td className="num">
                      {c.pacing === "steady" ? (
                        <span style={{ color: "var(--good)", fontSize: 10 }}>↗ steady</span>
                      ) : (
                        <span className="hbar">
                          <b
                            style={{
                              width: `${c.pacing}%`,
                              background: c.pacingBad ? "var(--bad)" : undefined,
                            }}
                          />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="trio">
          <div className="panel">
            <div className="p-head">
              <h3>Conversion Funnel</h3>
              <div className="sub">Checkout flow · 14 d</div>
              <button className="more">···</button>
            </div>
            <div className="p-body">
              {FUNNEL.map((f) => (
                <div key={f.label} className="funnel-row">
                  <div className="n">
                    {f.n}
                    <span style={{ fontSize: 11, color: "var(--dim)" }}>k</span>
                  </div>
                  <div className="l">
                    <div className="t">{f.label}</div>
                    <div className="s">{f.sub}</div>
                    <div className="bar">
                      <b style={{ width: `${f.w}%` }} />
                    </div>
                  </div>
                  <div className={`pct ${f.bad ? "bad" : ""}`}>{f.pct}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="p-head">
              <h3>Top Regions</h3>
              <div className="sub">By revenue</div>
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
              <h3>Devices &amp; Channels</h3>
              <div className="sub">Share of sessions</div>
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
              {DEVICES.map((d) => (
                <div key={d.label} className="dev-row">
                  <span>{d.icon}</span>
                  <span>{d.label}</span>
                  <span>
                    <b>{d.pct}</b>
                    <span className="pct" style={{ color: "var(--dim)", marginLeft: 6 }}>
                      {d.sub}
                    </span>
                  </span>
                </div>
              ))}
              <div
                style={{
                  fontSize: 10,
                  color: "var(--dim)",
                  textTransform: "uppercase",
                  letterSpacing: ".12em",
                  margin: "18px 0 8px",
                }}
              >
                Channel
              </div>
              {CHANNELS.map((c) => (
                <div key={c.label} className="dev-row">
                  <span>◉</span>
                  <span>{c.label}</span>
                  <span>
                    <b>{c.pct}</b>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <FooterBar />
    </>
  )
}

function CampaignCell({ c, linked }: { c: Campaign; linked?: boolean }) {
  return (
    <div className="cell-main">
      <div className={`ic ${c.ic}`}>{c.icLabel}</div>
      <div>
        <div>
          {c.name}
          {linked && (
            <span style={{ color: "var(--amber)", fontSize: 10, marginLeft: 4 }}>↗</span>
          )}
        </div>
        <div className="cell-sub">{c.sub}</div>
      </div>
    </div>
  )
}

// ---- client stub for tab toggle ----
import { TabGroup } from "./_components/TabGroup"

// ---- data ----
const KPIS = [
  {
    label: "Revenue",
    value: "₩184",
    unit: ".2M",
    chg: "▲ 24.8%",
    dir: "up",
    vs: "vs ₩147.6M",
    color: "#5EC27A",
    spark: "M0,22 L10,20 20,18 30,14 40,16 50,10 60,12 70,6 80,8 90,4 100,2",
  },
  {
    label: "Ad Spend",
    value: "₩44",
    unit: ".1M",
    chg: "▲ 8.2%",
    dir: "up",
    vs: "vs ₩40.8M",
    color: "#E8B04B",
    spark: "M0,16 L10,18 20,14 30,16 40,12 50,14 60,10 70,12 80,8 90,10 100,6",
  },
  {
    label: "Blended ROAS",
    value: "4.18",
    unit: "×",
    chg: "▲ 0.62",
    dir: "up",
    vs: "Target 3.5×",
    color: "#5EC27A",
    spark: "M0,18 L10,16 20,20 30,14 40,12 50,16 60,10 70,8 80,10 90,4 100,2",
  },
  {
    label: "CAC",
    value: "₩9",
    unit: ",240",
    chg: "▼ 12.1%",
    dir: "dn",
    vs: "vs ₩10,512",
    color: "#5EC27A",
    spark: "M0,6 L10,10 20,8 30,12 40,10 50,14 60,12 70,16 80,14 90,18 100,22",
  },
  {
    label: "Sessions",
    value: "412",
    unit: "k",
    chg: "▲ 38.4%",
    dir: "up",
    vs: "vs 298k",
    color: "#7DB8D6",
    spark: "M0,24 L10,20 20,18 30,22 40,14 50,12 60,14 70,8 80,10 90,6 100,4",
  },
  {
    label: "Conv. Rate",
    value: "3.84",
    unit: "%",
    chg: "▼ 0.3pp",
    dir: "dn",
    vs: "vs 4.14%",
    color: "#E5553B",
    spark: "M0,8 L10,10 20,6 30,12 40,14 50,10 60,16 70,14 80,18 90,16 100,20",
  },
]

const ALERTS = [
  {
    kind: "crit",
    tag: "Critical · Budget",
    time: "2m ago",
    msg: "Campaign <b>Spring·Brand·PROS</b> pacing 148% — will exhaust daily cap in 1h 20m",
    meta: "Meta · Spend <b>₩3.2M / ₩2.2M</b>",
  },
  {
    kind: "warn",
    tag: "Warn · CAC",
    time: "14m",
    msg: "Blended CAC on <b>TikTok / Launch·04</b> up 34% hour-over-hour",
    meta: "₩8,120 → <b>₩10,880</b>",
  },
  {
    kind: "info",
    tag: "Info · Creative",
    time: "48m",
    msg: 'New top creative: <b>"Morning Ritual 06"</b> CTR 3.9% · F.Freq 1.2',
    meta: "Consider scaling +30% budget",
  },
  {
    kind: "ok",
    tag: "OK · Goal",
    time: "1h",
    msg: "Monthly DTC revenue goal <b>hit</b> 18 days ahead of plan",
    meta: "₩180M / ₩180M · 100%",
  },
  {
    kind: "info",
    tag: "Info · SEO",
    time: "2h",
    msg: "<b>+14 keywords</b> entered top 10 on Google Search Console",
    meta: "Impressions <b>+28%</b>",
  },
  {
    kind: "warn",
    tag: "Warn · Funnel",
    time: "3h",
    msg: "Checkout → Payment dropoff <b>+6.2pp</b> on mobile Safari",
    meta: "Investigate · 412 affected sessions",
  },
]

type Campaign = {
  name: string
  href?: string
  ic: string
  icLabel: string
  sub: string
  spend: string
  revenue: string
  delta: string
  deltaDir: "up" | "dn"
  roas: string
  cac: string
  ctr: string
  conv: string
  pacing: number | "steady"
  pacingBad?: boolean
}

const CAMPAIGNS: Campaign[] = [
  {
    name: "Spring · Brand Prospecting",
    href: "/console/meta-ads",
    ic: "meta",
    icLabel: "M",
    sub: "Meta · 12 ad sets · ACTIVE",
    spend: "₩12,420,000",
    revenue: "₩61,840,000",
    delta: "+28%",
    deltaDir: "up",
    roas: "4.98×",
    cac: "₩8,120",
    ctr: "2.84%",
    conv: "1,529",
    pacing: 88,
  },
  {
    name: "Brand · Exact Match",
    ic: "goog",
    icLabel: "G",
    sub: "Google · 4 campaigns · ACTIVE",
    spend: "₩6,240,000",
    revenue: "₩42,180,000",
    delta: "+14%",
    deltaDir: "up",
    roas: "6.76×",
    cac: "₩4,820",
    ctr: "8.12%",
    conv: "1,294",
    pacing: 62,
  },
  {
    name: "Organic Social",
    ic: "org",
    icLabel: "O",
    sub: "Instagram + Naver · 48 posts",
    spend: "—",
    revenue: "₩28,930,000",
    delta: "+41%",
    deltaDir: "up",
    roas: "∞",
    cac: "—",
    ctr: "—",
    conv: "842",
    pacing: "steady",
  },
  {
    name: "Lifecycle · Returning Buyers",
    ic: "em",
    icLabel: "E",
    sub: "CRM · 6 flows · AUTOMATED",
    spend: "₩480,000",
    revenue: "₩22,410,000",
    delta: "+9%",
    deltaDir: "up",
    roas: "46.7×",
    cac: "₩1,240",
    ctr: "24.1%",
    conv: "612",
    pacing: 74,
  },
  {
    name: "Launch · 04 Morning Ritual",
    ic: "tiktok",
    icLabel: "T",
    sub: "TikTok · 8 creatives · ACTIVE",
    spend: "₩18,240,000",
    revenue: "₩18,904,000",
    delta: "−6%",
    deltaDir: "dn",
    roas: "1.04×",
    cac: "₩10,880",
    ctr: "3.94%",
    conv: "488",
    pacing: 98,
    pacingBad: true,
  },
  {
    name: "Retargeting · Cart Abandon",
    ic: "meta",
    icLabel: "M",
    sub: "Meta · 3 ad sets · ACTIVE",
    spend: "₩2,140,000",
    revenue: "₩9,816,000",
    delta: "+2%",
    deltaDir: "up",
    roas: "4.59×",
    cac: "₩5,620",
    ctr: "4.12%",
    conv: "224",
    pacing: 44,
  },
]

const FUNNEL = [
  { n: "412", label: "Sessions", sub: "All sources", w: 100, pct: "100%" },
  { n: "284", label: "Product View", sub: "−31% dropoff", w: 69, pct: "68.9%" },
  { n: "58", label: "Add to Cart", sub: "−79%", w: 14, pct: "14.1%" },
  { n: "22", label: "Checkout", sub: "−62%", w: 5.3, pct: "5.3%", bad: true },
  { n: "15", label: "Purchase", sub: "−32%", w: 3.84, pct: "3.84%" },
]

const REGIONS = [
  { flag: "🇰🇷", city: "Seoul", v: "₩68.2M", pct: "37%" },
  { flag: "🇰🇷", city: "Busan", v: "₩32.4M", pct: "18%" },
  { flag: "🇰🇷", city: "Incheon", v: "₩21.8M", pct: "12%" },
  { flag: "🇯🇵", city: "Tokyo", v: "₩18.6M", pct: "10%" },
  { flag: "🇰🇷", city: "Daegu", v: "₩14.2M", pct: "8%" },
  { flag: "🇰🇷", city: "Daejeon", v: "₩9.8M", pct: "5%" },
  { flag: "🇯🇵", city: "Osaka", v: "₩8.2M", pct: "4%" },
  { flag: "🇺🇸", city: "Los Angeles", v: "₩6.1M", pct: "3%" },
]

const DEVICES = [
  { icon: "📱", label: "Mobile · iOS", pct: "54.2%", sub: "223k" },
  { icon: "📱", label: "Mobile · Android", pct: "28.8%", sub: "119k" },
  { icon: "💻", label: "Desktop", pct: "15.4%", sub: "63k" },
  { icon: "◻️", label: "Tablet", pct: "1.6%", sub: "7k" },
]

const CHANNELS = [
  { label: "Paid Social", pct: "42%" },
  { label: "Organic Search", pct: "24%" },
  { label: "Email / CRM", pct: "18%" },
  { label: "Direct", pct: "11%" },
  { label: "Referral", pct: "5%" },
]

function RevSpendChart() {
  return (
    <svg viewBox="0 0 700 260" preserveAspectRatio="none">
      <defs>
        <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#E8B04B" stopOpacity=".4" />
          <stop offset="1" stopColor="#E8B04B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line className="grid-line" x1="40" x2="700" y1="40" y2="40" />
      <line className="grid-line" x1="40" x2="700" y1="100" y2="100" />
      <line className="grid-line" x1="40" x2="700" y1="160" y2="160" />
      <line className="grid-line" x1="40" x2="700" y1="220" y2="220" />
      <text className="y-label" x="0" y="44">25M</text>
      <text className="y-label" x="0" y="104">18M</text>
      <text className="y-label" x="0" y="164">12M</text>
      <text className="y-label" x="0" y="224">6M</text>

      <path
        d="M40,200 L90,190 140,180 190,150 240,160 290,120 340,130 390,90 440,100 490,70 540,80 590,40 640,60 690,30 L690,240 L40,240 Z"
        fill="url(#rev)"
      />
      <path
        d="M40,200 L90,190 140,180 190,150 240,160 290,120 340,130 390,90 440,100 490,70 540,80 590,40 640,60 690,30"
        fill="none"
        stroke="#E8B04B"
        strokeWidth="1.8"
      />
      <path
        d="M40,225 L90,222 140,220 190,218 240,215 290,210 340,212 390,205 440,208 490,200 540,202 590,195 640,198 690,190"
        fill="none"
        stroke="#7DB8D6"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />

      <g fill="#E8B04B">
        {[
          [40, 200], [90, 190], [140, 180], [190, 150], [240, 160], [290, 120],
          [340, 130], [390, 90], [440, 100], [490, 70], [540, 80], [590, 40], [640, 60],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2" />
        ))}
        <circle cx="690" cy="30" r="3" stroke="#0A0B0E" strokeWidth="1.5" />
      </g>
      <line x1="690" y1="30" x2="690" y2="240" stroke="#E8B04B" strokeWidth="1" strokeDasharray="2 3" opacity=".5" />
      <rect x="632" y="6" width="68" height="20" rx="3" fill="#E8B04B" />
      <text x="666" y="20" fill="#0A0B0E" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="600">
        ₩22.4M
      </text>

      <text className="x-label" x="40" y="256">Apr 1</text>
      <text className="x-label" x="190" y="256">Apr 4</text>
      <text className="x-label" x="340" y="256">Apr 7</text>
      <text className="x-label" x="490" y="256">Apr 10</text>
      <text className="x-label" x="660" y="256" textAnchor="end">Apr 13</text>
    </svg>
  )
}
