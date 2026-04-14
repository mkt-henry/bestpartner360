"use client"

import { Fragment, useState } from "react"

type AdSet = {
  name: string
  sub: string
  budget: string
  spend: string
  revenue: string
  delta: string
  deltaDir: "up" | "dn"
  roas: string
  cac: string
  ctr: string
  freq: string
  conv: string
  paused?: boolean
  details?: { label: string; value: string }[]
}

const AD_SETS: AdSet[] = [
  {
    name: "BRD_Prospecting · Lookalike 1%",
    sub: "KR · 25-44 · Interest stack A",
    budget: "₩400k/day",
    spend: "₩3.2M",
    revenue: "₩22.4M",
    delta: "+31%",
    deltaDir: "up",
    roas: "7.00×",
    cac: "₩6,240",
    ctr: "3.24%",
    freq: "2.1",
    conv: "512",
    details: [
      { label: "Impressions", value: "482,140" },
      { label: "Reach", value: "228,420" },
      { label: "Clicks", value: "15,621" },
      { label: "CPM", value: "₩6,636" },
      { label: "CPC", value: "₩205" },
      { label: "Hook rate", value: "38.4%" },
    ],
  },
  {
    name: "BRD_Prospecting · Lookalike 3%",
    sub: "KR · 25-44 · Interest stack B",
    budget: "₩400k/day",
    spend: "₩2.8M",
    revenue: "₩16.8M",
    delta: "+22%",
    deltaDir: "up",
    roas: "6.00×",
    cac: "₩7,120",
    ctr: "2.98%",
    freq: "2.3",
    conv: "394",
    details: [
      { label: "Impressions", value: "412,820" },
      { label: "Reach", value: "184,210" },
      { label: "Clicks", value: "12,302" },
      { label: "CPM", value: "₩6,782" },
      { label: "CPC", value: "₩228" },
      { label: "Hook rate", value: "34.2%" },
    ],
  },
  {
    name: "BRD_Prospecting · Broad Advantage+",
    sub: "KR · no stack · AI targeting",
    budget: "₩300k/day",
    spend: "₩2.1M",
    revenue: "₩12.8M",
    delta: "+18%",
    deltaDir: "up",
    roas: "6.10×",
    cac: "₩7,840",
    ctr: "2.84%",
    freq: "2.0",
    conv: "268",
    details: [
      { label: "Impressions", value: "318,440" },
      { label: "Reach", value: "162,180" },
      { label: "Clicks", value: "9,044" },
      { label: "CPM", value: "₩6,594" },
      { label: "CPC", value: "₩232" },
      { label: "Hook rate", value: "32.8%" },
    ],
  },
  {
    name: "BRD_Interest · Food & Wellness",
    sub: "KR · 30-54 · gourmet + wellness",
    budget: "₩250k/day",
    spend: "₩1.9M",
    revenue: "₩6.4M",
    delta: "−8%",
    deltaDir: "dn",
    roas: "3.37×",
    cac: "₩10,200",
    ctr: "2.10%",
    freq: "3.1",
    conv: "186",
    details: [
      { label: "Impressions", value: "248,120" },
      { label: "Reach", value: "82,040" },
      { label: "Clicks", value: "5,211" },
      { label: "CPM", value: "₩7,658" },
      { label: "CPC", value: "₩365" },
      { label: "Hook rate", value: "22.1%" },
    ],
  },
  {
    name: "BRD_Interest · Fitness (paused)",
    sub: "KR · 20-34 · strength + run",
    budget: "₩200k/day",
    spend: "₩920k",
    revenue: "₩1.2M",
    delta: "−24%",
    deltaDir: "dn",
    roas: "1.30×",
    cac: "₩14,120",
    ctr: "1.44%",
    freq: "4.6",
    conv: "82",
    paused: true,
    details: [
      { label: "Impressions", value: "142,840" },
      { label: "Reach", value: "31,480" },
      { label: "Clicks", value: "2,057" },
      { label: "CPM", value: "₩6,440" },
      { label: "CPC", value: "₩447" },
      { label: "Hook rate", value: "14.2%" },
    ],
  },
  {
    name: "BRD_Retargeting · Cart Abandon",
    sub: "KR · All ages · 3-day window",
    budget: "₩150k/day",
    spend: "₩680k",
    revenue: "₩3.1M",
    delta: "+12%",
    deltaDir: "up",
    roas: "4.56×",
    cac: "₩5,240",
    ctr: "4.12%",
    freq: "1.8",
    conv: "130",
    details: [
      { label: "Impressions", value: "92,180" },
      { label: "Reach", value: "52,410" },
      { label: "Clicks", value: "3,798" },
      { label: "CPM", value: "₩7,378" },
      { label: "CPC", value: "₩179" },
      { label: "Hook rate", value: "44.8%" },
    ],
  },
  {
    name: "BRD_Retargeting · Viewed PDP",
    sub: "KR · All ages · 7-day window",
    budget: "₩120k/day",
    spend: "₩540k",
    revenue: "₩2.2M",
    delta: "+6%",
    deltaDir: "up",
    roas: "4.07×",
    cac: "₩6,120",
    ctr: "3.48%",
    freq: "2.4",
    conv: "88",
    details: [
      { label: "Impressions", value: "78,420" },
      { label: "Reach", value: "32,810" },
      { label: "Clicks", value: "2,729" },
      { label: "CPM", value: "₩6,886" },
      { label: "CPC", value: "₩198" },
      { label: "Hook rate", value: "36.2%" },
    ],
  },
]

export function AdSetsTable() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["BRD_Prospecting · Lookalike 1%"]))
  const [sortCol, setSortCol] = useState<string>("revenue")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    } else {
      setSortCol(col)
      setSortDir("desc")
    }
  }

  const sortArrow = (col: string) =>
    sortCol === col ? (sortDir === "desc" ? " ↓" : " ↑") : ""

  return (
    <div className="panel">
      <div className="p-head">
        <h3>Ad Sets</h3>
        <div className="sub">{AD_SETS.length} total · {AD_SETS.filter((s) => !s.paused).length} active · {AD_SETS.filter((s) => s.paused).length} paused</div>
        <button className="more">···</button>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: "30%" }}>Ad Set</th>
              <th className="num">Budget</th>
              <th className="num sortable" onClick={() => handleSort("spend")} style={{ cursor: "pointer" }}>Spend{sortArrow("spend")}</th>
              <th className="num sortable" onClick={() => handleSort("revenue")} style={{ cursor: "pointer" }}>Revenue{sortArrow("revenue")}</th>
              <th className="num sortable" onClick={() => handleSort("roas")} style={{ cursor: "pointer" }}>ROAS{sortArrow("roas")}</th>
              <th className="num sortable" onClick={() => handleSort("cac")} style={{ cursor: "pointer" }}>CAC{sortArrow("cac")}</th>
              <th className="num">CTR</th>
              <th className="num">Freq.</th>
              <th className="num">Conv</th>
            </tr>
          </thead>
          <tbody>
            {AD_SETS.map((s) => (
              <Fragment key={s.name}>
                <tr
                  className={expanded.has(s.name) ? "expanded" : undefined}
                  onClick={() => toggle(s.name)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <div className="cell-main">
                      <span className="caret" style={{ transform: expanded.has(s.name) ? "rotate(90deg)" : undefined, transition: "transform .15s" }}>▸</span>
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
                {expanded.has(s.name) && s.details && (
                  <tr className="detail-row">
                    <td colSpan={9}>
                      <div className="detail-expand">
                        {s.details.map((d) => (
                          <div key={d.label} className="detail-cell">
                            <div className="l">{d.label}</div>
                            <div className="v">{d.value}</div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
