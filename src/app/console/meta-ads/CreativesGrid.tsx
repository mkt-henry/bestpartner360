"use client"

import { useEffect, useState } from "react"
import { TabGroup } from "../_components/TabGroup"

type CreativeArt = {
  rank: string
  badge?: { label: string; kind: "top" | "fatigue" }
  art: React.ReactNode
  title: string
  metrics: { label: string; value: string; tone?: "good" | "bad" }[]
}

type CreativeCopy = {
  t: string
  copy: string
  head: string
  id: string
  fmt: string
}

const COPY: Record<string, CreativeCopy> = {
  "01": {
    t: '"Morning Ritual" — <em>cinemagraph</em>',
    copy: "A slower kind of morning. Wild-fermented kombucha, made on the coast.",
    head: "Morning Ritual — 6-bottle starter",
    id: "CR-01-v3",
    fmt: "Video · 9:16",
  },
  "02": {
    t: '"Logotype still" — <em>1:1</em>',
    copy: "One bottle. One breath. Haeundae, since 2019.",
    head: "Starter kit · 해운대 컬렉션",
    id: "CR-02-v1",
    fmt: "Image · 1:1",
  },
  "03": {
    t: '"Bottle beauty shot" — <em>4:5</em>',
    copy: "Slow-brewed over 21 days. Nothing added. Nothing rushed.",
    head: "New release · Craft edition",
    id: "CR-03-v2",
    fmt: "Image · 4:5",
  },
  "04": {
    t: '"Editorial headline" — <em>static</em>',
    copy: "Read the label. Every ingredient, every day, every choice.",
    head: "Transparency promise",
    id: "CR-04-v4",
    fmt: "Image · 1:1",
  },
  "05": {
    t: '"Wave motion" — <em>6s video</em>',
    copy: "Made where the East Sea meets the city. Taste it.",
    head: "Waves collection · 4 flavors",
    id: "CR-05-v1",
    fmt: "Video · 1:1",
  },
  "06": {
    t: '"Ingredient carousel" — <em>5 frames</em>',
    copy: "Ginger. Green tea. Plum. Yuzu. Nothing else.",
    head: "Meet the four ingredients",
    id: "CR-06-v2",
    fmt: "Carousel · 5",
  },
  "07": {
    t: '"Retargeting — <em>ampersand</em>"',
    copy: "Still thinking about it? So are we. Free shipping over ₩30,000.",
    head: "Come back for the starter kit",
    id: "CR-07-v1",
    fmt: "Image · 1:1",
  },
  "08": {
    t: '"Coupon pop" — <em>paused</em>',
    copy: "15% off your first case. Code MORNING.",
    head: "Welcome offer",
    id: "CR-08-v1",
    fmt: "Image · 1:1",
  },
}

const CREATIVES: CreativeArt[] = [
  {
    rank: "01",
    badge: { label: "Top", kind: "top" },
    art: (
      <svg viewBox="0 0 200 200">
        <defs>
          <linearGradient id="cg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E5553B" />
            <stop offset="1" stopColor="#3a0e06" />
          </linearGradient>
        </defs>
        <rect width="200" height="200" fill="url(#cg1)" />
        <circle cx="140" cy="60" r="40" fill="#E8B04B" opacity=".8" />
        <rect x="30" y="120" width="140" height="50" fill="#0008" rx="4" />
        <text x="40" y="148" fill="#fff" fontFamily="Fraunces" fontSize="20" fontStyle="italic">
          Morning Ritual
        </text>
        <text x="40" y="162" fill="#E8B04B" fontFamily="JetBrains Mono" fontSize="9">
          SHOP NOW →
        </text>
      </svg>
    ),
    title: '01·v3 "Morning Ritual — cinemagraph"',
    metrics: [
      { label: "ROAS", value: "7.24×", tone: "good" },
      { label: "Spend", value: "₩3.2M" },
      { label: "CTR", value: "3.94%" },
      { label: "Hook rate", value: "42%" },
    ],
  },
  {
    rank: "02",
    art: (
      <svg viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#1a1814" />
        <g stroke="#E8B04B" strokeWidth="1" fill="none" opacity=".3">
          <path d="M0 50h200M0 100h200M0 150h200M50 0v200M100 0v200M150 0v200" />
        </g>
        <rect x="40" y="40" width="120" height="120" fill="#E8B04B" rx="60" />
        <text x="100" y="108" textAnchor="middle" fill="#0A0B0E" fontFamily="Fraunces" fontSize="38" fontWeight="500" fontStyle="italic">
          K
        </text>
        <text x="100" y="186" textAnchor="middle" fill="#E8B04B" fontFamily="JetBrains Mono" fontSize="9">
          HAEUNDAE · 해운대
        </text>
      </svg>
    ),
    title: '02·v1 "Logotype still — 1:1"',
    metrics: [
      { label: "ROAS", value: "5.81×", tone: "good" },
      { label: "Spend", value: "₩2.4M" },
      { label: "CTR", value: "2.62%" },
      { label: "Hook rate", value: "28%" },
    ],
  },
  {
    rank: "03",
    art: (
      <svg viewBox="0 0 200 200">
        <defs>
          <linearGradient id="cg3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4A5240" />
            <stop offset="1" stopColor="#14170e" />
          </linearGradient>
        </defs>
        <rect width="200" height="200" fill="url(#cg3)" />
        <ellipse cx="100" cy="130" rx="55" ry="18" fill="#0006" />
        <rect x="72" y="40" width="56" height="95" fill="#E8B04B" rx="4" />
        <rect x="78" y="50" width="44" height="20" fill="#0A0B0E" rx="2" />
        <text x="100" y="64" textAnchor="middle" fill="#E8B04B" fontFamily="JetBrains Mono" fontSize="7">
          CRAFT
        </text>
        <circle cx="100" cy="95" r="14" fill="#0A0B0E" />
        <text x="100" y="175" textAnchor="middle" fill="#E8E6DF" fontFamily="Fraunces" fontSize="11" fontStyle="italic">
          new release
        </text>
      </svg>
    ),
    title: '03·v2 "Bottle beauty shot — 4:5"',
    metrics: [
      { label: "ROAS", value: "5.12×", tone: "good" },
      { label: "Spend", value: "₩2.8M" },
      { label: "CTR", value: "2.44%" },
      { label: "Hook rate", value: "31%" },
    ],
  },
  {
    rank: "04",
    badge: { label: "Fatigue", kind: "fatigue" },
    art: (
      <svg viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#EAE3D2" />
        <rect x="20" y="30" width="160" height="140" fill="#fff" />
        <text x="100" y="80" textAnchor="middle" fill="#0A0B0E" fontFamily="Fraunces" fontSize="28" fontStyle="italic">
          Read the
        </text>
        <text x="100" y="110" textAnchor="middle" fill="#E5553B" fontFamily="Fraunces" fontSize="32" fontWeight="500">
          LABEL.
        </text>
        <line x1="50" y1="130" x2="150" y2="130" stroke="#0A0B0E" strokeWidth="1" />
        <text x="100" y="150" textAnchor="middle" fill="#0A0B0E" fontFamily="JetBrains Mono" fontSize="8">
          HAEUNDAE · EST 2019
        </text>
      </svg>
    ),
    title: '04·v4 "Editorial headline — static"',
    metrics: [
      { label: "ROAS", value: "3.42×" },
      { label: "Spend", value: "₩1.8M" },
      { label: "CTR", value: "1.12%", tone: "bad" },
      { label: "Freq.", value: "4.8", tone: "bad" },
    ],
  },
  {
    rank: "05",
    art: (
      <svg viewBox="0 0 200 200">
        <defs>
          <linearGradient id="cg5" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7DB8D6" />
            <stop offset="1" stopColor="#1e3a4a" />
          </linearGradient>
        </defs>
        <rect width="200" height="200" fill="url(#cg5)" />
        <g stroke="#fff" strokeWidth="2" fill="none" opacity=".6">
          <path d="M20 150 Q60 60 100 110 T180 80" />
          <path d="M20 170 Q60 80 100 130 T180 100" />
        </g>
        <polygon
          points="100,50 110,70 130,72 115,85 120,105 100,95 80,105 85,85 70,72 90,70"
          fill="#E8B04B"
        />
        <text x="100" y="180" textAnchor="middle" fill="#fff" fontFamily="JetBrains Mono" fontSize="9">
          NEW · WAVES COLLECTION
        </text>
      </svg>
    ),
    title: '05·v1 "Wave motion — 6s video"',
    metrics: [
      { label: "ROAS", value: "3.08×" },
      { label: "Spend", value: "₩1.4M" },
      { label: "CTR", value: "2.18%" },
      { label: "Thumb-stop", value: "48%", tone: "good" },
    ],
  },
  {
    rank: "06",
    art: (
      <svg viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#0A0B0E" />
        <g fill="#E8B04B">
          <rect x="24" y="24" width="64" height="64" />
          <rect x="108" y="24" width="32" height="32" />
          <rect x="152" y="24" width="24" height="64" />
          <rect x="24" y="108" width="32" height="32" />
          <rect x="72" y="108" width="56" height="56" />
          <rect x="140" y="108" width="36" height="36" />
          <rect x="72" y="176" width="24" height="4" />
          <rect x="140" y="156" width="36" height="8" />
        </g>
        <text x="100" y="196" textAnchor="middle" fill="#6E717A" fontFamily="JetBrains Mono" fontSize="7">
          CAROUSEL · 5 CARDS
        </text>
      </svg>
    ),
    title: '06·v2 "Ingredient carousel — 5 frames"',
    metrics: [
      { label: "ROAS", value: "2.88×" },
      { label: "Spend", value: "₩820k" },
      { label: "CTR", value: "1.94%" },
      { label: "Swipe rate", value: "71%" },
    ],
  },
  {
    rank: "07",
    art: (
      <svg viewBox="0 0 200 200">
        <defs>
          <radialGradient id="cg7" cx="50%" cy="40%">
            <stop offset="0" stopColor="#E8B04B" />
            <stop offset="1" stopColor="#0A0B0E" />
          </radialGradient>
        </defs>
        <rect width="200" height="200" fill="url(#cg7)" />
        <text x="100" y="95" textAnchor="middle" fill="#0A0B0E" fontFamily="Fraunces" fontSize="56" fontWeight="400" fontStyle="italic">
          &amp;
        </text>
        <text x="100" y="130" textAnchor="middle" fill="#0A0B0E" fontFamily="JetBrains Mono" fontSize="8" letterSpacing="2">
          KEEP GOING
        </text>
      </svg>
    ),
    title: '07·v1 "Retargeting — ampersand"',
    metrics: [
      { label: "ROAS", value: "2.42×" },
      { label: "Spend", value: "₩380k" },
      { label: "CTR", value: "3.12%" },
      { label: "Freq.", value: "2.1" },
    ],
  },
  {
    rank: "08",
    badge: { label: "Paused", kind: "fatigue" },
    art: (
      <svg viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#1A1E26" />
        <g stroke="#E5553B" strokeWidth="2" fill="none">
          <rect x="30" y="30" width="140" height="140" />
        </g>
        <text x="100" y="95" textAnchor="middle" fill="#E5553B" fontFamily="Fraunces" fontSize="22" fontStyle="italic">
          paused
        </text>
        <text x="100" y="120" textAnchor="middle" fill="#6E717A" fontFamily="JetBrains Mono" fontSize="8">
          CTR below floor
        </text>
      </svg>
    ),
    title: '08·v1 "Coupon pop — 1:1"',
    metrics: [
      { label: "ROAS", value: "0.82×", tone: "bad" },
      { label: "Spend", value: "₩240k" },
      { label: "CTR", value: "0.64%", tone: "bad" },
      { label: "Freq.", value: "5.2" },
    ],
  },
]

export function CreativesGrid() {
  const [openRank, setOpenRank] = useState<string | null>(null)
  const [activeVariant, setActiveVariant] = useState("A")

  useEffect(() => {
    if (!openRank) {
      document.body.style.overflow = ""
      return
    }
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenRank(null)
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [openRank])

  const openCreative = openRank ? CREATIVES.find((c) => c.rank === openRank) : null
  const openCopy = openRank ? COPY[openRank] : null

  return (
    <>
      <div className="panel">
        <div className="p-head">
          <h3>Top Creatives</h3>
          <div className="sub">Ranked by ROAS · click to expand</div>
          <TabGroup tabs={["All", "Image", "Video", "Carousel"]} initial="All" />
          <button className="more">···</button>
        </div>
        <div className="p-body">
          <div className="creatives">
            {CREATIVES.map((c) => (
              <div key={c.rank} className="ad" onClick={() => setOpenRank(c.rank)}>
                <div className="thumb">
                  {c.art}
                  <div className="rank">{c.rank}</div>
                  {c.badge && <div className={`badge ${c.badge.kind}`}>{c.badge.label}</div>}
                </div>
                <div className="info">
                  <div className="t">{c.title}</div>
                  <div className="metrics">
                    {c.metrics.map((m) => (
                      <div key={m.label}>
                        <div className="l">{m.label}</div>
                        <div className={`v ${m.tone ?? ""}`}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className={`modal-bg ${openRank ? "open" : ""}`}
        onClick={() => setOpenRank(null)}
      />
      <div className={`modal ${openRank ? "open" : ""}`} role="dialog" aria-hidden={!openRank}>
        {openCreative && openCopy && (
          <>
            <div className="modal-left">
              <div className="preview-wrap">
                <div className="preview-frame">
                  <div className="preview-chrome">
                    <div className="pav">H</div>
                    <div className="pn">
                      <span className="t">haeundae.kombucha</span>
                      <span className="s">Sponsored · 해운대 · 🌊</span>
                    </div>
                    <div className="pp">···</div>
                  </div>
                  <div style={{ width: "100%", height: "100%" }}>{openCreative.art}</div>
                  <div className="preview-cta">
                    <div className="copy">{openCopy.copy}</div>
                    <div className="link">
                      <div>
                        <b style={{ color: "#ffffff88" }}>haeundae.kr</b>
                        <div style={{ marginTop: 2 }}>{openCopy.head}</div>
                      </div>
                      <span
                        style={{
                          padding: "6px 10px",
                          background: "#fff",
                          color: "#000",
                          borderRadius: 4,
                          fontSize: 10,
                          letterSpacing: ".1em",
                        }}
                      >
                        SHOP NOW
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="preview-meta">
                <div>
                  <b>{openCopy.fmt}</b>
                  <div style={{ marginTop: 3 }}>Format</div>
                </div>
                <div>
                  <b>0:15</b>
                  <div style={{ marginTop: 3 }}>Duration</div>
                </div>
                <div>
                  <b>KO · EN</b>
                  <div style={{ marginTop: 3 }}>Language</div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <b>{openCopy.id}</b>
                  <div style={{ marginTop: 3 }}>Creative ID</div>
                </div>
              </div>
              <div className="variants">
                {[
                  { v: "A", h: "Variant A · Winner", n: 'Hook · "Morning ritual"', r: "7.24× ROAS", rc: undefined },
                  { v: "B", h: "Variant B", n: 'Hook · "Read the label"', r: "4.12× ROAS", rc: "var(--text-2)" },
                  { v: "C", h: "Variant C", n: 'Hook · "One bottle / one breath"', r: "3.08× ROAS", rc: "var(--dim)" },
                ].map((v) => (
                  <div
                    key={v.v}
                    className={`vt ${activeVariant === v.v ? "on" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveVariant(v.v)
                    }}
                  >
                    <div className="h">{v.h}</div>
                    <div className="n">{v.n}</div>
                    <div className="r" style={v.rc ? { color: v.rc } : undefined}>
                      {v.r}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-right">
              <div className="modal-head">
                <div>
                  <div className="src-tag">
                    <span className="ic">M</span>Meta Ads · Creative
                  </div>
                  <h2 dangerouslySetInnerHTML={{ __html: openCopy.t }} />
                  <div className="sub">
                    In set · BRD_Prospecting · Lookalike 1% &nbsp;·&nbsp; Live since Mar 18 · 26 days &nbsp;·&nbsp; v3{" "}
                    <span style={{ color: "var(--amber)" }}>(top-performing)</span>
                  </div>
                </div>
                <button className="modal-close" aria-label="Close" onClick={() => setOpenRank(null)}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M4 4l12 12M16 4L4 16" />
                  </svg>
                </button>
              </div>

              <div className="modal-body">
                <h4>Core metrics</h4>
                <div className="m-kpi">
                  <div className="k"><div className="l">Spend</div><div className="v">₩3.21M</div><div className="d">26 days · ₩123k/day</div></div>
                  <div className="k"><div className="l">Revenue</div><div className="v good">₩23.2M</div><div className="d">+₩892k vs Variant B</div></div>
                  <div className="k"><div className="l">ROAS</div><div className="v good">7.24×</div><div className="d">Campaign avg · 4.98×</div></div>
                  <div className="k"><div className="l">Purchases</div><div className="v">528</div><div className="d">CVR 4.82%</div></div>
                </div>

                <h4>Delivery</h4>
                <div className="m-row">
                  <div className="kk"><div className="l">Impressions</div><div className="v">1,284,942</div><div className="bar"><b style={{ width: "84%" }} /></div></div>
                  <div className="kk"><div className="l">Reach</div><div className="v">612,408</div><div className="bar"><b style={{ width: "62%" }} /></div></div>
                  <div className="kk"><div className="l">Clicks</div><div className="v">50,626</div><div className="bar"><b style={{ width: "72%" }} /></div></div>
                </div>
                <div className="m-row">
                  <div className="kk"><div className="l">CTR</div><div className="v" style={{ color: "var(--good)" }}>3.94%</div><div className="bar"><b style={{ width: "88%" }} /></div></div>
                  <div className="kk"><div className="l">CPM</div><div className="v">₩2,498</div><div className="bar"><b style={{ width: "42%" }} /></div></div>
                  <div className="kk"><div className="l">CPC</div><div className="v">₩63</div><div className="bar"><b style={{ width: "34%" }} /></div></div>
                </div>

                <h4>Video engagement</h4>
                <div className="m-row">
                  <div className="kk"><div className="l">3-sec hook rate</div><div className="v" style={{ color: "var(--good)" }}>42.1%</div><div className="bar"><b style={{ width: "84%" }} /></div></div>
                  <div className="kk"><div className="l">Thumb-stop</div><div className="v" style={{ color: "var(--good)" }}>48.3%</div><div className="bar"><b style={{ width: "92%" }} /></div></div>
                  <div className="kk"><div className="l">Hold rate (15s)</div><div className="v">61.2%</div><div className="bar"><b style={{ width: "61%" }} /></div></div>
                </div>

                <h4>7-day trend</h4>
                <div className="mini-chart">
                  <svg viewBox="0 0 400 90" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="mgrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor="#E8B04B" stopOpacity=".4" />
                        <stop offset="1" stopColor="#E8B04B" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,70 L60,62 120,58 180,48 240,40 300,30 360,22 400,18 L400,90 L0,90 Z" fill="url(#mgrad)" />
                    <path d="M0,70 L60,62 120,58 180,48 240,40 300,30 360,22 400,18" fill="none" stroke="#E8B04B" strokeWidth="1.6" />
                    <g fill="#E8B04B">
                      {[[0, 70], [60, 62], [120, 58], [180, 48], [240, 40], [300, 30], [360, 22]].map(([x, y], i) => (
                        <circle key={i} cx={x} cy={y} r="2" />
                      ))}
                      <circle cx="400" cy="18" r="3" stroke="#0A0B0E" strokeWidth="1.5" />
                    </g>
                    <text x="4" y="84" fill="#6E717A" fontFamily="JetBrains Mono" fontSize="8">Apr 7</text>
                    <text x="396" y="84" textAnchor="end" fill="#6E717A" fontFamily="JetBrains Mono" fontSize="8">Apr 13 · ₩1.42M</text>
                  </svg>
                </div>

                <h4>Variant comparison</h4>
                <table className="compare-tbl">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th className="num">A · Winner</th>
                      <th className="num">B</th>
                      <th className="num">C</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="lbl">ROAS</td><td className="num win">7.24×</td><td className="num">4.12×</td><td className="num">3.08×</td></tr>
                    <tr><td className="lbl">CTR</td><td className="num win">3.94%</td><td className="num">2.18%</td><td className="num">1.62%</td></tr>
                    <tr><td className="lbl">Hook rate</td><td className="num win">42.1%</td><td className="num">28.4%</td><td className="num">24.9%</td></tr>
                    <tr><td className="lbl">CPM</td><td className="num">₩2,498</td><td className="num win">₩2,184</td><td className="num">₩2,612</td></tr>
                    <tr><td className="lbl">Spend share</td><td className="num">58%</td><td className="num">28%</td><td className="num">14%</td></tr>
                  </tbody>
                </table>

                <h4>
                  Notes &amp; handoff{" "}
                  <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--dim)" }}>3 comments</span>
                </h4>
                <div className="notes">
                  <div className="note">
                    <div className="nav h">HP</div>
                    <div className="n-body">
                      <div className="n-h"><b>Henry Park</b><span className="t">4h ago</span></div>
                      <div className="n-t">
                        Variant A is clearly winning. Scaling budget +30% on Lookalike 1% tomorrow. Keep B for retargeting.{" "}
                        <code>EXP-204</code>
                      </div>
                      <span className="n-tag">Action</span>
                    </div>
                  </div>
                  <div className="note">
                    <div className="nav j">JL</div>
                    <div className="n-body">
                      <div className="n-h"><b>Jiwoo Lee</b><span className="t">Yesterday · 16:22</span></div>
                      <div className="n-t">
                        Cinemagraph loop is the hook. Shot list ready for <b>v4</b> — same pacing, new pour, ocean
                        sound. Will upload by Fri.
                      </div>
                      <span className="n-tag">Creative</span>
                    </div>
                  </div>
                  <div className="note">
                    <div className="nav a">AI</div>
                    <div className="n-body">
                      <div className="n-h"><b>BP360 Agent</b><span className="t">2d ago · 09:18</span></div>
                      <div className="n-t">
                        This creative is <b>statistically significant</b> at 98% confidence vs Variant B after 72h.
                        Recommend declaring winner and retiring C.
                      </div>
                      <span className="n-tag ok">Insight</span>
                    </div>
                  </div>
                </div>
                <div className="composer">
                  <div className="av">HP</div>
                  <input placeholder="Leave a note, @mention someone…" />
                  <button className="send">Send</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
