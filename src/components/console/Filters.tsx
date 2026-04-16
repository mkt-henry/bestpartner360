"use client"

import { useState } from "react"

type Group = { label: string; chips: string[]; initial: string }

const DEFAULT_GROUPS: Group[] = [
  { label: "기간", chips: ["24H", "7D", "14D", "30D", "QTD", "직접 설정 ↓"], initial: "14D" },
  { label: "소스", chips: ["전체", "Meta", "Google", "TikTok", "Organic"], initial: "전체" },
]

export function Filters({
  groups = DEFAULT_GROUPS,
  sync = "방금 전",
  extra,
}: {
  groups?: Group[]
  sync?: string
  extra?: React.ReactNode
}) {
  return (
    <div className="filters">
      {groups.map((g) => (
        <ChipGroup key={g.label} {...g} />
      ))}
      <div className="filter-group">
        <span className="fg-label">세그먼트</span>
        <button className="chip dashed">+ 필터 추가</button>
      </div>
      {extra}
      <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--dim)", whiteSpace: "nowrap" }}>
        마지막 동기화 <b style={{ color: "var(--text-2)" }}>{sync}</b>
      </div>
    </div>
  )
}

function ChipGroup({ label, chips, initial }: Group) {
  const [active, setActive] = useState(initial)
  return (
    <div className="filter-group">
      <span className="fg-label">{label}</span>
      {chips.map((c) => {
        const isCustom = c.includes("↓")
        return (
          <button
            key={c}
            className={`chip ${active === c ? "on" : ""}`}
            onClick={isCustom ? undefined : () => setActive(c)}
          >
            {c}
          </button>
        )
      })}
    </div>
  )
}
