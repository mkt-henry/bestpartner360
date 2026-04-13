"use client"

import { useEffect, useState } from "react"

const DOTS = [
  { top: "38%", left: "18%", title: "Seoul · 412", hot: true },
  { top: "48%", left: "28%", title: "Busan · 214" },
  { top: "32%", left: "42%", title: "Tokyo · 188" },
  { top: "40%", left: "52%", title: "Osaka · 94" },
  { top: "46%", left: "68%", title: "Taipei · 52" },
  { top: "52%", left: "80%", title: "Singapore · 42" },
  { top: "70%", left: "62%", title: "Sydney · 28" },
  { top: "78%", left: "78%", title: "Auckland · 12" },
  { top: "72%", left: "34%", title: "Jakarta · 18" },
  { top: "62%", left: "14%", title: "LA · 36" },
]

export function RealtimePanel() {
  const [num, setNum] = useState(1284)
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: 30 }, (_, i) => 15 + ((i * 37) % 30))
  )

  useEffect(() => {
    const id1 = setInterval(() => {
      setNum(1200 + Math.floor(Math.random() * 180))
    }, 3000)
    const id2 = setInterval(() => {
      setBars((prev) => {
        const next = prev.slice(1)
        next.push(20 + Math.random() * 28)
        return next
      })
    }, 2000)
    return () => {
      clearInterval(id1)
      clearInterval(id2)
    }
  }, [])

  return (
    <div className="panel">
      <div className="p-head">
        <h3>Realtime</h3>
        <div className="sub">Last 30 minutes · auto-refreshing</div>
        <button className="more">···</button>
      </div>
      <div className="p-body">
        <div className="rt-wrap">
          <div>
            <div className="rt-big">
              {num.toLocaleString()}
              <em>now</em>
            </div>
            <div className="rt-label">Users on site · live</div>
            <div style={{ marginTop: 16, fontSize: 11, color: "var(--dim)" }}>
              Page views{" "}
              <b style={{ color: "var(--text-2)", fontFamily: "var(--c-mono)" }}>4,812</b> / 30 min
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: "var(--dim)" }}>
              Events{" "}
              <b style={{ color: "var(--text-2)", fontFamily: "var(--c-mono)" }}>18,290</b> / 30 min
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: "var(--dim)" }}>
              Conversions{" "}
              <b style={{ color: "var(--good)", fontFamily: "var(--c-mono)" }}>142</b> / 30 min
            </div>
          </div>
          <div>
            <div className="rt-map">
              {DOTS.map((d, i) => (
                <div
                  key={i}
                  className={`rt-dot ${d.hot ? "hot" : ""}`}
                  style={{ top: d.top, left: d.left }}
                  title={d.title}
                />
              ))}
            </div>
            <div className="rt-bars">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className={`b ${i === bars.length - 1 ? "on" : ""}`}
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
            <div
              style={{
                fontSize: 9,
                color: "var(--dim)",
                display: "flex",
                justifyContent: "space-between",
                marginTop: 4,
              }}
            >
              <span>-30 min</span>
              <span>-15 min</span>
              <span>Now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
