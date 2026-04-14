"use client"

import { useEffect, useRef, useState } from "react"

type Crumb = { label: string; strong?: boolean }

export function Topbar({
  crumbs,
  compare = "Previous period",
  alerts = 0,
}: {
  crumbs: Crumb[]
  compare?: string
  alerts?: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  return (
    <header className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "contents" }}>
            {c.strong ? <b>{c.label}</b> : <span>{c.label}</span>}
            {i < crumbs.length - 1 && <span className="sep">/</span>}
          </span>
        ))}
      </div>
      <div className="search">
        <svg viewBox="0 0 20 20">
          <circle cx="9" cy="9" r="6" />
          <path d="M14 14l4 4" />
        </svg>
        <input ref={inputRef} placeholder="Search campaigns, reports, keywords…" />
        <kbd>⌘K</kbd>
      </div>
      <div className="tbar-actions">
        {alerts > 0 && <button className="pill warn">◉ {alerts} alerts</button>}
        <button className="pill">
          <span className="k">Compare:</span> {compare}
        </button>
        <button className="icon-btn" title="Notifications">
          <svg viewBox="0 0 20 20">
            <path d="M4 8a6 6 0 1 1 12 0v4l2 3H2l2-3z" />
            <path d="M8 17a2 2 0 0 0 4 0" />
          </svg>
          <span className="ping" />
        </button>
        <button className="icon-btn" title="Export">
          <svg viewBox="0 0 20 20">
            <path d="M10 3v11M5 9l5 5 5-5M3 17h14" />
          </svg>
        </button>
      </div>
    </header>
  )
}

export function FooterBar() {
  const [time, setTime] = useState<string>("—")
  useEffect(() => {
    const tick = () =>
      setTime("KST · " + new Date().toLocaleTimeString("en-GB"))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="footer-bar">
      <div className="g">
        <span className="st">All systems operational</span>
      </div>
      <div className="g">
        <span>{time}</span>
        <span>BP360 Console</span>
      </div>
    </div>
  )
}
