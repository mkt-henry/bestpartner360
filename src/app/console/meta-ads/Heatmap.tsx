"use client"

import { useMemo } from "react"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const PALETTE = [
  "#14171D", "#1f1a12", "#2a2214", "#3a2d10", "#4e3a12",
  "#6b4f19", "#8a621c", "#a17722", "#c79228", "#E8B04B",
]

function prand(i: number) {
  const x = Math.sin(i * 9973 + 7) * 10000
  return x - Math.floor(x)
}

export function Heatmap() {
  const cells = useMemo(() => {
    return DAYS.map((d, di) =>
      Array.from({ length: 24 }, (_, h) => {
        let base = prand(di * 31 + h) * 0.4
        if (h >= 18 && h <= 22) base += 0.5
        if (h >= 11 && h <= 14 && di >= 5) base += 0.35
        if (h < 6) base *= 0.3
        base = Math.min(0.99, base)
        const idx = Math.floor(base * PALETTE.length)
        return {
          bg: PALETTE[idx],
          title: `${d} ${h}:00 · ROAS ${(base * 8 + 1).toFixed(2)}×`,
        }
      })
    )
  }, [])

  return (
    <>
      <div className="heat">
        <div className="hh" />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="hh">
            {h % 2 === 0 ? h : ""}
          </div>
        ))}
        {DAYS.map((d, di) => (
          <div key={d} style={{ display: "contents" }}>
            <div className="dd">{d}</div>
            {cells[di].map((c, h) => (
              <div key={h} className="cell" style={{ background: c.bg }} title={c.title} />
            ))}
          </div>
        ))}
      </div>
      <div className="heat legend">
        <span>Low</span>
        <div className="sw">
          <span style={{ background: "#14171D" }} />
          <span style={{ background: "#3a2d10" }} />
          <span style={{ background: "#6b4f19" }} />
          <span style={{ background: "#a17722" }} />
          <span style={{ background: "#E8B04B" }} />
        </div>
        <span>8.2× ROAS</span>
      </div>
    </>
  )
}
