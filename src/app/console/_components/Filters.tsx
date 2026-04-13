"use client"

import { useState } from "react"

type Group = { label: string; chips: string[]; initial: string }

const DEFAULT_GROUPS: Group[] = [
  { label: "Range", chips: ["24H", "7D", "14D", "30D", "QTD", "Custom ↓"], initial: "14D" },
  { label: "Source", chips: ["All", "Meta", "Google", "TikTok", "Organic"], initial: "All" },
]

export function Filters({
  groups = DEFAULT_GROUPS,
  sync = "00:42s ago",
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
        <span className="fg-label">Segment</span>
        <button className="chip dashed">+ Add filter</button>
      </div>
      {extra}
      <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--dim)", whiteSpace: "nowrap" }}>
        Last sync <b style={{ color: "var(--text-2)" }}>{sync}</b>
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
