"use client"

import { useEffect, useRef, useState } from "react"

type RealtimeRow = { label: string; value: number }
type RealtimeData = {
  propertyId: string
  websiteUrl: string | null
  activeUsers: number
  topPages: RealtimeRow[]
  countries: RealtimeRow[]
  events: RealtimeRow[]
  devices: RealtimeRow[]
  fetchedAt: string
}

function fmtNum(n: number) {
  return n.toLocaleString("en-US")
}

export function RealtimeContent() {
  const [data, setData] = useState<RealtimeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null)
  const [history, setHistory] = useState<number[]>(Array(60).fill(0))
  const firstLoad = useRef(true)
  const lastFetchRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch("/api/console/ga4/realtime", { cache: "no-store" })
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(json.error ?? `HTTP ${res.status}`)
          return
        }
        setError(null)
        setData(json)
        lastFetchRef.current = Date.now()
        setSecondsAgo(0)
        setHistory((prev) => {
          if (firstLoad.current) {
            firstLoad.current = false
            return [...prev.slice(1), json.activeUsers]
          }
          return [...prev.slice(1), json.activeUsers]
        })
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "unknown")
      }
    }

    load()
    const id = setInterval(load, 10_000)
    const tick = setInterval(() => {
      if (lastFetchRef.current != null) {
        setSecondsAgo(Math.max(0, Math.round((Date.now() - lastFetchRef.current) / 1000)))
      }
    }, 1000)
    return () => {
      cancelled = true
      clearInterval(id)
      clearInterval(tick)
    }
  }, [])

  const maxBar = Math.max(1, ...history)
  const activeUsers = data?.activeUsers ?? 0
  const totalEventCount = (data?.events ?? []).reduce((s, r) => s + r.value, 0)
  const totalPageUsers = (data?.topPages ?? []).reduce((s, r) => s + r.value, 0)

  const deltaAgo = secondsAgo != null ? `${secondsAgo}s` : "—"

  return (
    <>
      {error && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="p-body" style={{ padding: 14, color: "var(--dim)", fontSize: 11 }}>
            GA4 Realtime API 오류: {error}
          </div>
        </div>
      )}

      <div className="kpi-row">
        <div className="kpi">
          <div className="top">Active users</div>
          <div className="v" style={{ color: "var(--good)" }}>
            {fmtNum(activeUsers)}
            <span className="u"> now</span>
          </div>
          <div className="d">지난 30분 기준 · 업데이트 {deltaAgo} 전</div>
        </div>
        <div className="kpi">
          <div className="top">Events (30m)</div>
          <div className="v">
            {fmtNum(totalEventCount)}
          </div>
          <div className="d">상위 {data?.events.length ?? 0} 이벤트</div>
        </div>
        <div className="kpi">
          <div className="top">Active pages</div>
          <div className="v">{fmtNum(data?.topPages.length ?? 0)}</div>
          <div className="d">총 활성 사용자 {fmtNum(totalPageUsers)}</div>
        </div>
        <div className="kpi">
          <div className="top">Countries</div>
          <div className="v">{fmtNum(data?.countries.length ?? 0)}</div>
          <div className="d">지리 분포</div>
        </div>
        <div className="kpi">
          <div className="top">Devices</div>
          <div className="v">{data?.devices.length ?? 0}</div>
          <div className="d">카테고리</div>
        </div>
        <div className="kpi">
          <div className="top">Property</div>
          <div className="v" style={{ fontSize: 14 }}>
            {data?.propertyId ?? "—"}
          </div>
          <div className="d">{data?.websiteUrl ?? "—"}</div>
        </div>
      </div>

      <div className="two">
        <div className="panel">
          <div className="p-head">
            <h3>Active users · Last 60 ticks</h3>
            <div className="sub">10초 간격 샘플링</div>
          </div>
          <div className="p-body">
            <div className="rt-bars" style={{ height: 120 }}>
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`b ${i === history.length - 1 ? "on" : ""}`}
                  style={{ height: `${(h / maxBar) * 100}px` }}
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
              <span>-10 min</span>
              <span>-5 min</span>
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
            {(data?.topPages ?? []).length === 0 && (
              <div style={{ padding: 20, color: "var(--dim)", fontSize: 11, textAlign: "center" }}>
                데이터 없음
              </div>
            )}
            {(data?.topPages ?? []).map((p) => {
              const pct = totalPageUsers > 0 ? ((p.value / totalPageUsers) * 100).toFixed(0) : "0"
              return (
                <div key={p.label} className="geo-row">
                  <span style={{ color: "var(--amber)" }}>◉</span>
                  <span>
                    <code
                      style={{
                        background: "var(--bg-2)",
                        padding: "1px 5px",
                        borderRadius: 3,
                        fontSize: 10,
                        border: "1px solid var(--line)",
                        color: "var(--amber)",
                      }}
                    >
                      {p.label}
                    </code>
                  </span>
                  <span>
                    <b className="v">{fmtNum(p.value)}</b>
                    <span className="pct">{pct}%</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="trio">
        <div className="panel">
          <div className="p-head">
            <h3>Countries</h3>
            <div className="sub">Active users</div>
          </div>
          <div className="p-body">
            {(data?.countries ?? []).length === 0 && (
              <div style={{ padding: 16, color: "var(--dim)", fontSize: 11, textAlign: "center" }}>
                데이터 없음
              </div>
            )}
            {(data?.countries ?? []).map((r) => (
              <div key={r.label} className="geo-row">
                <span>{r.label}</span>
                <span />
                <span>
                  <b className="v">{fmtNum(r.value)}</b>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>Events</h3>
            <div className="sub">Last 30 min</div>
          </div>
          <div className="p-body" style={{ padding: 0 }}>
            <div className="events-list" style={{ maxHeight: 320 }}>
              {(data?.events ?? []).length === 0 && (
                <div style={{ padding: 16, color: "var(--dim)", fontSize: 11, textAlign: "center" }}>
                  데이터 없음
                </div>
              )}
              {(data?.events ?? []).map((e) => (
                <div key={e.label} className="ev">
                  <span className="pd" />
                  <span className="name">{e.label}</span>
                  <span className="count">{fmtNum(e.value)}</span>
                  <span className="t">—</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>Devices</h3>
            <div className="sub">Active users</div>
          </div>
          <div className="p-body">
            {(data?.devices ?? []).length === 0 && (
              <div style={{ padding: 16, color: "var(--dim)", fontSize: 11, textAlign: "center" }}>
                데이터 없음
              </div>
            )}
            {(data?.devices ?? []).map((d) => (
              <div key={d.label} className="geo-row">
                <span>{d.label}</span>
                <span />
                <span>
                  <b className="v">{fmtNum(d.value)}</b>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
