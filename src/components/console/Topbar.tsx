"use client"

import { useEffect, useRef, useState } from "react"

type Crumb = { label: string; strong?: boolean }

export function Topbar({ crumbs }: { crumbs: Crumb[] }) {
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
        <input ref={inputRef} placeholder="캠페인, 리포트, 키워드 검색…" />
        <kbd>⌘K</kbd>
      </div>
      <div className="tbar-actions">
        <button className="icon-btn" title="알림">
          <svg viewBox="0 0 20 20">
            <path d="M4 8a6 6 0 1 1 12 0v4l2 3H2l2-3z" />
            <path d="M8 17a2 2 0 0 0 4 0" />
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
      setTime("KST · " + new Date().toLocaleTimeString("ko-KR", { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="footer-bar">
      <div className="g">
        <span>{time}</span>
        <span>BP360 Console</span>
      </div>
    </div>
  )
}
