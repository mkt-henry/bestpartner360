import Link from "next/link"
import { Topbar, FooterBar } from "../_components/Topbar"
import { TabGroup } from "../_components/TabGroup"
import { Heatmap } from "./Heatmap"
import { CreativesGrid } from "./CreativesGrid"

export default function MetaAdsPage() {
  return (
    <>
      <Topbar
        crumbs={[
          { label: "Workspace" },
          { label: "Haeundae" },
          { label: "Meta Ads" },
          { label: "Spring · Brand Prospecting", strong: true },
        ]}
        alerts={0}
        compare="Previous period"
      />

      <div className="detail-head">
        <Link className="back-link" href="/console">
          ← Back to Overview
        </Link>
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic">M</span>
              <span>Meta Ads · Conversion Objective · ADV+ Shopping</span>
            </div>
            <h1>
              Spring · Brand <em>Prospecting</em>
            </h1>
            <div className="dh-meta">
              <span className="status-pill">Active</span>
              <span className="sep">·</span>
              <span className="m">ID <b>120219847412</b></span>
              <span className="sep">·</span>
              <span className="m">12 ad sets</span>
              <span className="sep">·</span>
              <span className="m">38 creatives</span>
              <span className="sep">·</span>
              <span className="m">Started <b>Mar 14, 2026</b></span>
              <span className="sep">·</span>
              <span className="m">Owner <b>Henry P.</b></span>
              <span className="sep">·</span>
              <span className="m">Last edit <b>4h ago</b></span>
            </div>
          </div>
          <div className="dh-actions">
            <button className="btn">⎘ Duplicate</button>
            <button className="btn danger">◼ Pause</button>
            <button className="btn primary">Edit in Meta ↗</button>
          </div>
        </div>

        <div className="budget" style={{ marginBottom: 20 }}>
          <div>
            <div className="l">
              <span>Daily budget · <b>₩2,200,000</b></span>
              <span className="warn">◉ Pacing 148% — will exhaust by 15:40 KST</span>
              <span>Lifetime cap · <b>₩40.0M</b></span>
            </div>
            <div className="bar">
              <b className="over" style={{ width: "64%" }} />
              <span className="tick" style={{ left: "42%" }} />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "var(--dim)",
                marginTop: 6,
                fontFamily: "var(--c-mono)",
              }}
            >
              <span>Spent today ₩1.42M / ₩2.20M</span>
              <span>Expected at pace · ₩0.96M</span>
              <span>Lifetime ₩12.42M / ₩40.00M</span>
            </div>
          </div>
          <div className="num">4.98<small>× ROAS</small></div>
        </div>
      </div>

      <DrillTabs />

      <div className="canvas">
        <div className="kpi-row">
          <div className="kpi"><div className="top">Spend</div><div className="v">₩12<span className="u">.42M</span></div><div className="d"><span className="chg up">▲ 14%</span> vs last 14d</div></div>
          <div className="kpi"><div className="top">Revenue</div><div className="v">₩61<span className="u">.84M</span></div><div className="d"><span className="chg up">▲ 28%</span> attrib · 7d click</div></div>
          <div className="kpi"><div className="top">ROAS</div><div className="v">4.98<span className="u">×</span></div><div className="d"><span className="chg up">▲ 0.8</span> target 3.5×</div></div>
          <div className="kpi"><div className="top">CAC</div><div className="v">₩8<span className="u">,120</span></div><div className="d"><span className="chg dn">▼ 9%</span> vs ₩8,920</div></div>
          <div className="kpi"><div className="top">CTR</div><div className="v">2.84<span className="u">%</span></div><div className="d"><span className="chg up">▲ 0.2pp</span> benchmark 1.9%</div></div>
          <div className="kpi"><div className="top">Frequency</div><div className="v">2.41</div><div className="d"><span className="chg up">▲ 0.3</span> watch ≥3.5</div></div>
        </div>

        <div className="two">
          <div className="panel">
            <div className="p-head">
              <h3>Hourly Performance</h3>
              <div className="sub">Last 14 d · smoothed</div>
              <TabGroup tabs={["Spend / Rev", "CTR / CVR", "CPM"]} initial="Spend / Rev" />
              <button className="more">···</button>
            </div>
            <div className="p-body">
              <div style={{ display: "flex", gap: 28, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".1em" }}>◼ Revenue</div>
                  <div style={{ fontFamily: "var(--c-serif)", fontSize: 22, fontVariationSettings: "'opsz' 144" }}>₩61.84M</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".1em" }}>◼ Spend</div>
                  <div style={{ fontFamily: "var(--c-serif)", fontSize: 22, fontVariationSettings: "'opsz' 144" }}>₩12.42M</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".1em" }}>◼ Peak hour</div>
                  <div style={{ fontFamily: "var(--c-serif)", fontSize: 22, fontVariationSettings: "'opsz' 144" }}>
                    21:00 <span style={{ color: "var(--dim)", fontSize: 13 }}>KST</span>
                  </div>
                </div>
              </div>
              <HourlyChart />
            </div>
          </div>

          <div className="panel">
            <div className="p-head">
              <h3>Day × Hour Heatmap</h3>
              <div className="sub">ROAS density · 14 d</div>
              <button className="more">···</button>
            </div>
            <div className="p-body">
              <Heatmap />
            </div>
          </div>
        </div>

        <CreativesGrid />

        <div className="panel">
          <div className="p-head">
            <h3>Ad Sets</h3>
            <div className="sub">12 total · 10 active · 2 paused</div>
            <button className="more">···</button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "30%" }}>Ad Set</th>
                  <th className="num">Budget</th>
                  <th className="num">Spend</th>
                  <th className="num">Revenue</th>
                  <th className="num">ROAS</th>
                  <th className="num">CAC</th>
                  <th className="num">CTR</th>
                  <th className="num">Freq.</th>
                  <th className="num">Conv</th>
                </tr>
              </thead>
              <tbody>
                {AD_SETS.map((s) => (
                  <tr key={s.name} className={s.expanded ? "expanded" : undefined}>
                    <td>
                      <div className="cell-main">
                        <span className="caret">▸</span>
                        <span className={`stat-dot ${s.paused ? "paused" : ""}`} />
                        <div>
                          <div>{s.name}</div>
                          <div className="cell-sub">{s.sub}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num">{s.budget}</td>
                    <td className="num">{s.spend}</td>
                    <td className="num">
                      {s.revenue} <span className={`delta ${s.deltaDir}`}>{s.delta}</span>
                    </td>
                    <td className="num">{s.roas}</td>
                    <td className="num">{s.cac}</td>
                    <td className="num">{s.ctr}</td>
                    <td className="num">{s.freq}</td>
                    <td className="num">{s.conv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="two">
          <div className="panel">
            <div className="p-head">
              <h3>Audience · Age × Gender</h3>
              <div className="sub">ROAS by segment · 14 d</div>
              <button className="more">···</button>
            </div>
            <div className="p-body">
              <div className="aud">
                <div className="lbl" />
                {["18-24", "25-34", "35-44", "45-54", "55-64", "65+"].map((h) => (
                  <div key={h} className="hd">{h}</div>
                ))}
                <div className="lbl">Female</div>
                {FEMALE.map((c, i) => (
                  <div key={i} className="c" style={{ background: c.bg, color: c.dark ? "#0A0B0E" : undefined }}>
                    <span className="v">{c.v}</span>
                    <span className="p">{c.p}</span>
                  </div>
                ))}
                <div className="lbl">Male</div>
                {MALE.map((c, i) => (
                  <div key={i} className="c" style={{ background: c.bg, color: c.dark ? "#0A0B0E" : undefined }}>
                    <span className="v">{c.v}</span>
                    <span className="p">{c.p}</span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--dim)",
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: "1px dashed var(--line)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  Strong pocket · <b style={{ color: "var(--amber)" }}>Female 25–34</b> (7.4× ROAS, 36% of revenue)
                </span>
                <span>
                  Weakest · <b style={{ color: "var(--bad)" }}>Male 65+</b>
                </span>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="p-head">
              <h3>Placements</h3>
              <div className="sub">Share of impressions &amp; efficiency</div>
              <button className="more">···</button>
            </div>
            <div className="p-body">
              {PLACEMENTS.map((p) => (
                <div key={p.name} className="place-row">
                  <span className="n">{p.name}</span>
                  <div className="bar">
                    <b style={{ width: `${p.w}%`, background: p.bad ? "var(--bad)" : undefined }} />
                  </div>
                  <span className="v">{p.v}</span>
                  <span className="d" style={p.bad ? { color: "var(--bad)" } : undefined}>
                    {p.roas}
                  </span>
                  <span className="d">{p.share}</span>
                </div>
              ))}
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
                ◉ Recommendation · Exclude <b>Audience Network</b> — saves ₩0.5M for ~0 revenue
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>Change Log</h3>
            <div className="sub">Campaign edits · last 7 d</div>
            <TabGroup tabs={["All", "Human", "System", "Agent"]} initial="All" />
            <button className="more">···</button>
          </div>
          <div className="p-body" style={{ paddingTop: 8 }}>
            {CHANGELOG.map((l, i) => (
              <div key={i} className="log-row">
                <div className={`d ${l.kind ?? ""}`} />
                <div className="who">
                  {l.who}
                  <span className="when">{l.when}</span>
                </div>
                <div className="what" dangerouslySetInnerHTML={{ __html: l.what }} />
                <div className="act">{l.act}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <FooterBar />
    </>
  )
}

function DrillTabs() {
  return (
    <div className="drill-tabs">
      <a className="on" href="#">Overview</a>
      <a href="#">Ad Sets <span className="c">12</span></a>
      <a href="#">Creatives <span className="c">38</span></a>
      <a href="#">Audiences <span className="c">6</span></a>
      <a href="#">Placements</a>
      <a href="#">Schedule</a>
      <a href="#">Changelog</a>
      <a href="#">Settings</a>
    </div>
  )
}

function HourlyChart() {
  return (
    <svg viewBox="0 0 700 240" preserveAspectRatio="none" style={{ width: "100%", height: 220 }}>
      <defs>
        <linearGradient id="r2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#E8B04B" stopOpacity=".35" />
          <stop offset="1" stopColor="#E8B04B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="30" x2="700" y1="40" y2="40" stroke="#242832" strokeDasharray="2 4" />
      <line x1="30" x2="700" y1="100" y2="100" stroke="#242832" strokeDasharray="2 4" />
      <line x1="30" x2="700" y1="160" y2="160" stroke="#242832" strokeDasharray="2 4" />
      <path
        d="M30,180 L60,172 90,168 120,155 150,160 180,140 210,130 240,120 270,110 300,100 330,90 360,80 390,70 420,60 450,55 480,40 510,50 540,65 570,75 600,90 630,110 660,130 690,150 L690,220 L30,220 Z"
        fill="url(#r2)"
      />
      <path
        d="M30,180 L60,172 90,168 120,155 150,160 180,140 210,130 240,120 270,110 300,100 330,90 360,80 390,70 420,60 450,55 480,40 510,50 540,65 570,75 600,90 630,110 660,130 690,150"
        fill="none"
        stroke="#E8B04B"
        strokeWidth="1.8"
      />
      <path
        d="M30,200 L60,198 90,196 120,192 150,193 180,188 210,184 240,180 270,178 300,176 330,172 360,168 390,164 420,160 450,158 480,152 510,156 540,160 570,164 600,170 630,176 660,180 690,186"
        fill="none"
        stroke="#7DB8D6"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <circle cx="480" cy="40" r="3" fill="#E8B04B" stroke="#0A0B0E" strokeWidth="1.5" />
      <rect x="444" y="14" width="72" height="18" rx="3" fill="#E8B04B" />
      <text x="480" y="26" fill="#0A0B0E" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="600">
        21:00 · ₩4.8M
      </text>
      <text x="30" y="236" fill="#6E717A" fontSize="9">00</text>
      <text x="200" y="236" fill="#6E717A" fontSize="9">06</text>
      <text x="370" y="236" fill="#6E717A" fontSize="9">12</text>
      <text x="540" y="236" fill="#6E717A" fontSize="9">18</text>
      <text x="690" y="236" fill="#6E717A" fontSize="9" textAnchor="end">24</text>
    </svg>
  )
}

const AD_SETS = [
  {
    name: "BRD_Prospecting · Lookalike 1%",
    sub: "KR · 25-44 · Interest stack A",
    budget: "₩400k/day",
    spend: "₩3.2M",
    revenue: "₩22.4M",
    delta: "+31%",
    deltaDir: "up" as const,
    roas: "7.00×",
    cac: "₩6,240",
    ctr: "3.24%",
    freq: "2.1",
    conv: "512",
    expanded: true,
  },
  {
    name: "BRD_Prospecting · Lookalike 3%",
    sub: "KR · 25-44 · Interest stack B",
    budget: "₩400k/day",
    spend: "₩2.8M",
    revenue: "₩16.8M",
    delta: "+22%",
    deltaDir: "up" as const,
    roas: "6.00×",
    cac: "₩7,120",
    ctr: "2.98%",
    freq: "2.3",
    conv: "394",
  },
  {
    name: "BRD_Prospecting · Broad Advantage+",
    sub: "KR · no stack · AI targeting",
    budget: "₩300k/day",
    spend: "₩2.1M",
    revenue: "₩12.8M",
    delta: "+18%",
    deltaDir: "up" as const,
    roas: "6.10×",
    cac: "₩7,840",
    ctr: "2.84%",
    freq: "2.0",
    conv: "268",
  },
  {
    name: "BRD_Interest · Food & Wellness",
    sub: "KR · 30-54 · gourmet + wellness",
    budget: "₩250k/day",
    spend: "₩1.9M",
    revenue: "₩6.4M",
    delta: "−8%",
    deltaDir: "dn" as const,
    roas: "3.37×",
    cac: "₩10,200",
    ctr: "2.10%",
    freq: "3.1",
    conv: "186",
  },
  {
    name: "BRD_Interest · Fitness (paused)",
    sub: "KR · 20-34 · strength + run",
    budget: "₩200k/day",
    spend: "₩920k",
    revenue: "₩1.2M",
    delta: "−24%",
    deltaDir: "dn" as const,
    roas: "1.30×",
    cac: "₩14,120",
    ctr: "1.44%",
    freq: "4.6",
    conv: "82",
    paused: true,
  },
]

const FEMALE = [
  { v: "6.8×", p: "₩18.2M", bg: "#E8B04B", dark: true },
  { v: "7.4×", p: "₩22.1M", bg: "#E8B04B", dark: true },
  { v: "5.2×", p: "₩8.4M", bg: "#a17722", dark: true },
  { v: "3.8×", p: "₩2.1M", bg: "#6b4f19" },
  { v: "2.1×", p: "₩0.6M", bg: "#3a2d10" },
  { v: "0.8×", p: "₩0.1M", bg: "#14171D" },
]

const MALE = [
  { v: "3.2×", p: "₩2.8M", bg: "#6b4f19" },
  { v: "4.9×", p: "₩4.2M", bg: "#a17722", dark: true },
  { v: "3.6×", p: "₩2.4M", bg: "#6b4f19" },
  { v: "2.2×", p: "₩0.8M", bg: "#3a2d10" },
  { v: "1.1×", p: "₩0.2M", bg: "#14171D" },
  { v: "0.4×", p: "₩0.04M", bg: "#14171D" },
]

const PLACEMENTS = [
  { name: "Instagram Feed", w: 88, v: "₩24.8M", roas: "6.12×", share: "38%" },
  { name: "Instagram Reels", w: 72, v: "₩18.4M", roas: "5.84×", share: "24%" },
  { name: "Facebook Feed", w: 52, v: "₩12.1M", roas: "4.12×", share: "18%" },
  { name: "Instagram Stories", w: 38, v: "₩4.2M", roas: "3.24×", share: "12%" },
  { name: "Facebook Reels", w: 18, v: "₩1.8M", roas: "2.10×", share: "6%" },
  { name: "Audience Network", w: 8, v: "₩0.5M", roas: "0.82×", share: "2%", bad: true },
]

const CHANGELOG = [
  {
    who: "Henry Park",
    when: "4h ago · 11:42",
    what: 'Increased daily budget on <code>BRD_Prospecting · Lookalike 1%</code> from <s>₩300k</s> to <code>₩400k</code> · reason: "ROAS &gt; 6.8× stable 72h"',
    act: "Budget",
  },
  {
    who: "BP360 Agent",
    when: "6h ago · 09:18",
    what: "Auto-paused <code>04·v4 Editorial headline</code> — frequency reached 4.8, CTR dropped below 1.2% floor for 48h",
    act: "AI · Pause",
    kind: "ai",
  },
  {
    who: "System",
    when: "8h ago · 07:00",
    what: "Daily sync complete · <code>Meta Ads API v20.0</code> · 12 ad sets, 38 creatives reconciled",
    act: "Sync",
    kind: "sys",
  },
  {
    who: "Jiwoo Lee",
    when: "Yesterday · 16:30",
    what: "Uploaded 3 new creatives to <code>BRD_Prospecting · Broad Advantage+</code> · tagged for A/B test <code>EXP-204</code>",
    act: "Creative",
  },
  {
    who: "BP360 Agent",
    when: "Yesterday · 14:02",
    what: 'Suggested excluding <code>Audience Network</code> · projected save ₩480k / month · <b style="color:var(--amber)">Pending approval</b>',
    act: "AI · Suggestion",
    kind: "ai",
  },
  {
    who: "Henry Park",
    when: "2d ago · 10:14",
    what: "Launched new ad set <code>BRD_Interest · Food &amp; Wellness</code> with daily budget <code>₩250k</code>",
    act: "Ad set",
  },
  {
    who: "System",
    when: "3d ago · 00:00",
    what: "Attribution window updated: <s>1d click</s> → <code>7d click + 1d view</code> across all ad sets",
    act: "Config",
    kind: "sys",
  },
]
