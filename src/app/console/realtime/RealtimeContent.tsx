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
  return n.toLocaleString("ko-KR")
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

  const deltaAgoLabel = secondsAgo != null ? `${secondsAgo}초` : "—"

  return (
    <>
      {error && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="p-body" style={{ padding: 14, color: "var(--dim)", fontSize: 11 }}>
            GA4 실시간 API 오류: {error}
          </div>
        </div>
      )}

      <div className="kpi-row">
        <div className="kpi">
          <div className="top">활성 사용자</div>
          <div className="v" style={{ color: "var(--good)" }}>
            {fmtNum(activeUsers)}
            <span className="u"> 현재</span>
          </div>
          <div className="d">지난 30분 기준 · 업데이트 {deltaAgoLabel} 전</div>
        </div>
        <div className="kpi">
          <div className="top">이벤트 (30분)</div>
          <div className="v">
            {fmtNum(totalEventCount)}
          </div>
          <div className="d">상위 {data?.events.length ?? 0} 이벤트</div>
        </div>
        <div className="kpi">
          <div className="top">활성 페이지</div>
          <div className="v">{fmtNum(data?.topPages.length ?? 0)}</div>
          <div className="d">총 활성 사용자 {fmtNum(totalPageUsers)}</div>
        </div>
        <div className="kpi">
          <div className="top">국가</div>
          <div className="v">{fmtNum(data?.countries.length ?? 0)}</div>
          <div className="d">지리 분포</div>
        </div>
        <div className="kpi">
          <div className="top">기기</div>
          <div className="v">{data?.devices.length ?? 0}</div>
          <div className="d">카테고리</div>
        </div>
        <div className="kpi">
          <div className="top">속성</div>
          <div className="v" style={{ fontSize: 14 }}>
            {data?.propertyId ?? "—"}
          </div>
          <div className="d">{data?.websiteUrl ?? "—"}</div>
        </div>
      </div>

      <div className="two">
        <div className="panel">
          <div className="p-head">
            <h3>활성 사용자 · 최근 60개 구간</h3>
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
              <span>현재</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="p-head">
            <h3>현재 활성 페이지</h3>
            <div className="sub">지금</div>
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
            <h3>국가</h3>
            <div className="sub">활성 사용자</div>
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
            <h3>이벤트</h3>
            <div className="sub">최근 30분</div>
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
            <h3>기기</h3>
            <div className="sub">활성 사용자</div>
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
