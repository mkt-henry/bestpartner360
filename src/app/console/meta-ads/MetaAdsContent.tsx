"use client"

import { Fragment, useState } from "react"
import { DrillTabs } from "../_components/DrillTabs"
import type {
  MetaAdsPageData,
  HourlyCell,
  AudienceCell,
  PlacementRow,
} from "./page"

function formatWon(n: number): string {
  if (n >= 100000000) return `₩${(n / 100000000).toFixed(2)}억`
  if (n >= 10000000) return `₩${(n / 10000000).toFixed(1)}천만`
  if (n >= 10000) return `₩${Math.round(n / 10000).toLocaleString("ko-KR")}만`
  return `₩${Math.round(n).toLocaleString("ko-KR")}`
}

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString("ko-KR")
}

export function MetaAdsContent({ data }: { data: MetaAdsPageData }) {
  const TABS = [
    { id: "overview", label: "개요" },
    { id: "adsets", label: "광고 세트", count: String(data.adsets.length) },
    { id: "creatives", label: "소재", count: String(data.creatives.length) },
    { id: "audiences", label: "오디언스" },
    { id: "placements", label: "게재 위치" },
  ]
  const [tab, setTab] = useState("overview")
  const show = (ids: string[]) => ids.includes(tab) || tab === "overview"

  const { kpis, adsets, creatives, hourly, audiences, placements } = data

  return (
    <>
      <DrillTabs tabs={TABS} initial="overview" onChange={setTab} />

      <div className="canvas">
        {show(["adsets", "creatives", "audiences", "placements"]) && (
          <div className="kpi-row">
            <Kpi label="광고비" value={formatWon(kpis.spend)} />
            <Kpi label="매출" value={kpis.revenue > 0 ? formatWon(kpis.revenue) : "—"} />
            <Kpi label="ROAS" value={kpis.roas > 0 ? kpis.roas.toFixed(2) : "—"} unit={kpis.roas > 0 ? "×" : ""} />
            <Kpi label="CAC" value={kpis.cac > 0 ? formatWon(kpis.cac) : "—"} />
            <Kpi label="CTR" value={kpis.ctr > 0 ? kpis.ctr.toFixed(2) : "—"} unit="%" />
            <Kpi label="빈도" value={kpis.frequency > 0 ? kpis.frequency.toFixed(2) : "—"} />
          </div>
        )}

        {show(["adsets"]) && (
          <div className="kpi-row">
            <Kpi label="노출" value={formatNum(kpis.impressions)} />
            <Kpi label="Reach" value={formatNum(kpis.reach)} />
            <Kpi label="클릭" value={formatNum(kpis.clicks)} />
            <Kpi label="CPM" value={kpis.cpm > 0 ? `₩${Math.round(kpis.cpm).toLocaleString("ko-KR")}` : "—"} />
            <Kpi label="구매" value={formatNum(kpis.purchases)} />
            <Kpi label="광고 세트" value={String(adsets.length)} />
          </div>
        )}

        {show(["adsets"]) && (
          <div className="panel">
            <div className="p-head">
              <h3>광고 세트</h3>
              <div className="sub">
                총 {adsets.length}개 · 매출 순 정렬
              </div>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "30%" }}>광고 세트</th>
                    <th className="num">광고비</th>
                    <th className="num">매출</th>
                    <th className="num">ROAS</th>
                    <th className="num">CAC</th>
                    <th className="num">CTR</th>
                    <th className="num">빈도</th>
                    <th className="num">구매</th>
                  </tr>
                </thead>
                <tbody>
                  {adsets.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: 24, textAlign: "center", color: "var(--dim)" }}>
                        기간 내 활성화된 광고 세트가 없습니다.
                      </td>
                    </tr>
                  )}
                  {adsets.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="cell-main">
                          <span className="stat-dot" />
                          <div>
                            <div>{s.name}</div>
                            <div className="cell-sub">
                              {s.campaignName}
                              {s.optimizationGoal ? ` · ${s.optimizationGoal}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="num">{formatWon(s.spend)}</td>
                      <td className="num">{s.revenue > 0 ? formatWon(s.revenue) : "—"}</td>
                      <td className="num">{s.roas > 0 ? `${s.roas.toFixed(2)}×` : "—"}</td>
                      <td className="num">{s.cac > 0 ? formatWon(s.cac) : "—"}</td>
                      <td className="num">{s.ctr > 0 ? `${s.ctr.toFixed(2)}%` : "—"}</td>
                      <td className="num">{s.frequency > 0 ? s.frequency.toFixed(2) : "—"}</td>
                      <td className="num">{s.purchases > 0 ? formatNum(s.purchases) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {show(["creatives"]) && (
          <div className="panel">
            <div className="p-head">
              <h3>소재</h3>
              <div className="sub">매출 상위 {creatives.length}개</div>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "32%" }}>광고</th>
                    <th className="num">광고비</th>
                    <th className="num">매출</th>
                    <th className="num">ROAS</th>
                    <th className="num">CTR</th>
                    <th className="num">노출</th>
                    <th className="num">구매</th>
                  </tr>
                </thead>
                <tbody>
                  {creatives.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--dim)" }}>
                        기간 내 활성 광고가 없습니다.
                      </td>
                    </tr>
                  )}
                  {creatives.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="cell-main">
                          <div className="ic meta">M</div>
                          <div>
                            <div>{c.name}</div>
                            <div className="cell-sub">
                              {c.adsetName} · {c.campaignName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="num">{formatWon(c.spend)}</td>
                      <td className="num">{c.revenue > 0 ? formatWon(c.revenue) : "—"}</td>
                      <td className="num">{c.roas > 0 ? `${c.roas.toFixed(2)}×` : "—"}</td>
                      <td className="num">{c.ctr > 0 ? `${c.ctr.toFixed(2)}%` : "—"}</td>
                      <td className="num">{formatNum(c.impressions)}</td>
                      <td className="num">{c.purchases > 0 ? formatNum(c.purchases) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {show(["adsets"]) && <HourlyPanel hourly={hourly} />}

        {tab === "audiences" && <AudiencePanel audiences={audiences} />}

        {tab === "placements" && <PlacementPanel placements={placements} />}
      </div>
    </>
  )
}

function HourlyPanel({ hourly }: { hourly: HourlyCell[] }) {
  const maxRev = Math.max(1, ...hourly.map((h) => h.revenue))
  const maxSpend = Math.max(1, ...hourly.map((h) => h.spend))
  const peak = hourly.reduce((best, h) => (h.revenue > best.revenue ? h : best), hourly[0])
  const totalRev = hourly.reduce((s, h) => s + h.revenue, 0)
  const totalSpend = hourly.reduce((s, h) => s + h.spend, 0)

  return (
    <div className="panel">
      <div className="p-head">
        <h3>시간대별 성과</h3>
        <div className="sub">광고주 시간대 기준 분해</div>
      </div>
      <div className="p-body">
        <div style={{ display: "flex", gap: 28, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".1em" }}>
              ◼ 매출
            </div>
            <div style={{ fontFamily: "var(--c-serif)", fontSize: 22 }}>{formatWon(totalRev)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".1em" }}>
              ◼ 광고비
            </div>
            <div style={{ fontFamily: "var(--c-serif)", fontSize: 22 }}>{formatWon(totalSpend)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".1em" }}>
              ◼ 피크 시간대
            </div>
            <div style={{ fontFamily: "var(--c-serif)", fontSize: 22 }}>
              {String(peak?.hour ?? 0).padStart(2, "0")}:00{" "}
              <span style={{ color: "var(--dim)", fontSize: 13 }}>{formatWon(peak?.revenue ?? 0)}</span>
            </div>
          </div>
        </div>
        <HourlySvg hourly={hourly} maxRev={maxRev} maxSpend={maxSpend} />
      </div>
    </div>
  )
}

function HourlySvg({
  hourly,
  maxRev,
  maxSpend,
}: {
  hourly: HourlyCell[]
  maxRev: number
  maxSpend: number
}) {
  const W = 700
  const H = 240
  const padL = 30
  const padR = 10
  const padT = 20
  const padB = 30
  const xAt = (i: number) => padL + ((W - padL - padR) * i) / 23
  const yRev = (v: number) => H - padB - ((H - padT - padB) * v) / maxRev
  const ySpend = (v: number) => H - padB - ((H - padT - padB) * v) / maxSpend

  const revPath = hourly.map((h, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yRev(h.revenue)}`).join(" ")
  const spendPath = hourly.map((h, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${ySpend(h.spend)}`).join(" ")
  const area = `${revPath} L${xAt(23)},${H - padB} L${xAt(0)},${H - padB} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 220 }}>
      <defs>
        <linearGradient id="r2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#8AA6A1" stopOpacity=".35" />
          <stop offset="1" stopColor="#8AA6A1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={padL}
          x2={W - padR}
          y1={H - padB - (H - padT - padB) * f}
          y2={H - padB - (H - padT - padB) * f}
          stroke="#242832"
          strokeDasharray="2 4"
        />
      ))}
      <path d={area} fill="url(#r2)" />
      <path d={revPath} fill="none" stroke="#8AA6A1" strokeWidth="1.8" />
      <path d={spendPath} fill="none" stroke="#7DB8D6" strokeWidth="1.5" strokeDasharray="4 3" />
      {[0, 6, 12, 18, 23].map((h) => (
        <text key={h} x={xAt(h)} y={H - 8} fill="#6E717A" fontSize="9">
          {String(h).padStart(2, "0")}
        </text>
      ))}
    </svg>
  )
}

function AudiencePanel({ audiences }: { audiences: AudienceCell[] }) {
  const ages = Array.from(new Set(audiences.map((a) => a.age))).sort()
  const genders = Array.from(new Set(audiences.map((a) => a.gender))).sort()
  const byKey = new Map<string, AudienceCell>()
  for (const a of audiences) byKey.set(`${a.gender}|${a.age}`, a)
  const maxRoas = Math.max(0.01, ...audiences.map((a) => a.roas))

  const bgFor = (roas: number) => {
    if (roas <= 0) return "#14171D"
    const t = Math.min(1, roas / maxRoas)
    if (t > 0.75) return "#8AA6A1"
    if (t > 0.5) return "#6F8B87"
    if (t > 0.25) return "#4F6965"
    return "#2F3C3A"
  }

  if (audiences.length === 0) {
    return (
      <div className="panel">
        <div className="p-head">
          <h3>오디언스 · 연령 × 성별</h3>
          <div className="sub">세그먼트별 ROAS</div>
        </div>
        <div className="p-body" style={{ padding: 24, color: "var(--dim)", fontSize: 12 }}>
          기간 내 데이터가 없습니다.
        </div>
      </div>
    )
  }

  const best = audiences.reduce((a, b) => (b.roas > a.roas ? b : a))
  const worst = audiences.reduce((a, b) => (b.roas < a.roas && b.spend > 0 ? b : a))

  return (
    <div className="panel">
      <div className="p-head">
        <h3>오디언스 · 연령 × 성별</h3>
        <div className="sub">세그먼트별 ROAS</div>
      </div>
      <div className="p-body">
        <div className="aud">
          <div className="lbl" />
          {ages.map((h) => (
            <div key={h} className="hd">
              {h}
            </div>
          ))}
          {genders.map((g) => (
            <Fragment key={g}>
              <div className="lbl">{g}</div>
              {ages.map((age) => {
                const cell = byKey.get(`${g}|${age}`)
                const roas = cell?.roas ?? 0
                return (
                  <div
                    key={`${g}-${age}`}
                    className="c"
                    style={{ background: bgFor(roas), color: roas > maxRoas * 0.5 ? "#0A0B0E" : undefined }}
                  >
                    <span className="v">{roas > 0 ? `${roas.toFixed(1)}×` : "—"}</span>
                    <span className="p">{cell ? formatWon(cell.revenue) : "—"}</span>
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
        {best && worst && (
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
              최고 성과 · <b style={{ color: "var(--amber)" }}>{best.gender} {best.age}</b>{" "}
              ({best.roas.toFixed(2)}× ROAS, {formatWon(best.revenue)})
            </span>
            <span>
              최저 성과 ·{" "}
              <b style={{ color: "var(--bad)" }}>
                {worst.gender} {worst.age}
              </b>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function PlacementPanel({ placements }: { placements: PlacementRow[] }) {
  if (placements.length === 0) {
    return (
      <div className="panel">
        <div className="p-head">
          <h3>게재 위치</h3>
          <div className="sub">노출 점유율 및 효율</div>
        </div>
        <div className="p-body" style={{ padding: 24, color: "var(--dim)", fontSize: 12 }}>
          기간 내 데이터가 없습니다.
        </div>
      </div>
    )
  }
  const maxShare = Math.max(...placements.map((p) => p.sharePct))
  return (
    <div className="panel">
      <div className="p-head">
        <h3>게재 위치</h3>
        <div className="sub">노출 점유율 및 효율</div>
      </div>
      <div className="p-body">
        {placements.map((p, i) => {
          const bad = p.roas > 0 && p.roas < 1
          return (
            <div key={`${p.platform}-${p.position}-${i}`} className="place-row">
              <span className="n">
                {p.platform} · {p.position}
              </span>
              <div className="bar">
                <b
                  style={{
                    width: `${maxShare > 0 ? (p.sharePct / maxShare) * 100 : 0}%`,
                    background: bad ? "var(--bad)" : undefined,
                  }}
                />
              </div>
              <span className="v">{formatWon(p.revenue)}</span>
              <span className="d" style={bad ? { color: "var(--bad)" } : undefined}>
                {p.roas > 0 ? `${p.roas.toFixed(2)}×` : "—"}
              </span>
              <span className="d">{p.sharePct.toFixed(1)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Kpi({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="kpi">
      <div className="top">
        <span>{label}</span>
      </div>
      <div className="v">
        {value}
        {unit && <span className="u">{unit}</span>}
      </div>
    </div>
  )
}
