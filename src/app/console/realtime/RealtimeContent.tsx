"use client"

import { useEffect, useState } from "react"

export function RealtimeContent() {
  const [num, setNum] = useState(1284)
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: 60 }, (_, i) => 15 + ((i * 37) % 30))
  )
  const [events, setEvents] = useState(INITIAL_EVENTS)

  useEffect(() => {
    const id1 = setInterval(() => setNum(1200 + Math.floor(Math.random() * 180)), 3000)
    const id2 = setInterval(() => {
      setBars((prev) => {
        const next = prev.slice(1)
        next.push(20 + Math.random() * 28)
        return next
      })
    }, 1000)
    const id3 = setInterval(() => {
      setEvents((prev) => {
        const newEvent = POOL[Math.floor(Math.random() * POOL.length)]
        return [{ ...newEvent, t: "just now" }, ...prev.slice(0, 19)]
      })
    }, 4000)
    return () => { clearInterval(id1); clearInterval(id2); clearInterval(id3) }
  }, [])

  return (
    <>
      <div className="kpi-row">
        <div className="kpi">
          <div className="top">Active users</div>
          <div className="v" style={{ color: "var(--good)" }}>{num.toLocaleString()}<span className="u"> now</span></div>
          <div className="d">on site right now</div>
        </div>
        <div className="kpi">
          <div className="top">Page views / min</div>
          <div className="v">248<span className="u">/min</span></div>
          <div className="d"><span className="chg up">▲ 12%</span> vs avg</div>
        </div>
        <div className="kpi">
          <div className="top">Events / min</div>
          <div className="v">892<span className="u">/min</span></div>
          <div className="d"><span className="chg up">▲ 8%</span> vs avg</div>
        </div>
        <div className="kpi">
          <div className="top">Conversions / h</div>
          <div className="v" style={{ color: "var(--good)" }}>142</div>
          <div className="d">₩18.4M revenue</div>
        </div>
        <div className="kpi">
          <div className="top">Cart adds / h</div>
          <div className="v">384</div>
          <div className="d">₩28.2M in cart</div>
        </div>
        <div className="kpi">
          <div className="top">Errors</div>
          <div className="v" style={{ color: "var(--good)" }}>0</div>
          <div className="d">No errors detected</div>
        </div>
      </div>

      <div className="two">
        <div className="panel">
          <div className="p-head">
            <h3>Traffic · Last 60 min</h3>
            <div className="sub">Users per minute</div>
          </div>
          <div className="p-body">
            <div className="rt-bars" style={{ height: 120 }}>
              {bars.map((h, i) => (
                <div
                  key={i}
                  className={`b ${i === bars.length - 1 ? "on" : ""}`}
                  style={{ height: `${h * 2.5}px` }}
                />
              ))}
            </div>
            <div style={{ fontSize: 9, color: "var(--dim)", display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span>-60 min</span>
              <span>-30 min</span>
              <span>Now</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>Top Active Pages</h3>
            <div className="sub">Right now</div>
          </div>
          <div className="p-body">
            {PAGES.map((p) => (
              <div key={p.path} className="geo-row">
                <span style={{ color: "var(--amber)" }}>◉</span>
                <span><code style={{ background: "var(--bg-2)", padding: "1px 5px", borderRadius: 3, fontSize: 10, border: "1px solid var(--line)", color: "var(--amber)" }}>{p.path}</code></span>
                <span><b className="v">{p.users}</b><span className="pct">{p.pct}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="p-head">
          <h3>Live Event Stream</h3>
          <div className="sub">Auto-updating</div>
        </div>
        <div className="p-body" style={{ padding: 0 }}>
          <div className="events-list" style={{ maxHeight: 380 }}>
            {events.map((e, i) => (
              <div key={`${i}-${e.name}`} className={`ev ${e.kind ?? ""}`}>
                <span className="pd" />
                <span className="name" dangerouslySetInnerHTML={{ __html: e.name }} />
                <span className="count">{e.count}</span>
                <span className="t">{e.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

const PAGES = [
  { path: "/", users: "412", pct: "32%" },
  { path: "/shop/starter-kit", users: "284", pct: "22%" },
  { path: "/shop/craft-edition", users: "168", pct: "13%" },
  { path: "/cart", users: "142", pct: "11%" },
  { path: "/journal/how-it-made", users: "98", pct: "8%" },
  { path: "/shop/waves", users: "82", pct: "6%" },
  { path: "/checkout", users: "64", pct: "5%" },
  { path: "/about", users: "34", pct: "3%" },
]

const INITIAL_EVENTS = [
  { kind: "conv", name: "purchase <b>order_24817</b>", count: "₩68,400", t: "12s" },
  { kind: "eng", name: "add_to_cart <b>MR-6-KR</b>", count: "₩68,400", t: "38s" },
  { kind: "", name: "page_view <b>/shop/starter-kit</b>", count: "—", t: "41s" },
  { kind: "eng", name: "view_item <b>MR-6-KR</b>", count: "₩68,400", t: "52s" },
  { kind: "", name: "session_start", count: "—", t: "54s" },
  { kind: "", name: "scroll <b>75%</b>", count: "—", t: "1m 04s" },
  { kind: "conv", name: "purchase <b>order_24816</b>", count: "₩142,800", t: "1m 18s" },
  { kind: "eng", name: "begin_checkout", count: "₩142,800", t: "1m 32s" },
]

const POOL = [
  { kind: "conv", name: "purchase <b>order_24818</b>", count: "₩94,200" },
  { kind: "eng", name: "add_to_cart <b>CR-4-KR</b>", count: "₩92,000" },
  { kind: "", name: "page_view <b>/shop/starter-kit</b>", count: "—" },
  { kind: "", name: "page_view <b>/</b>", count: "—" },
  { kind: "eng", name: "view_item <b>WV-2-KR</b>", count: "₩38,400" },
  { kind: "", name: "session_start", count: "—" },
  { kind: "", name: "scroll <b>50%</b>", count: "—" },
  { kind: "eng", name: "begin_checkout", count: "₩68,400" },
  { kind: "eng", name: "add_to_cart <b>MR-6-KR</b>", count: "₩68,400" },
  { kind: "", name: "page_view <b>/journal/how-it-made</b>", count: "—" },
  { kind: "conv", name: "purchase <b>order_24819</b>", count: "₩248,000" },
]
