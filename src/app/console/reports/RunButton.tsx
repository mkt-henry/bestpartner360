"use client"

import { useState } from "react"

export function RunButton({ reportId, title }: { reportId: string; title: string }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function run() {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/run`, { method: "POST" })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(j?.error ?? `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const disp = res.headers.get("content-disposition") ?? ""
      const m = /filename="([^"]+)"/.exec(disp)
      const fallback = `${title.replace(/[^A-Za-z0-9_-]/g, "_")}.csv`
      const filename = m ? m[1] : fallback
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "실패")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        style={{
          fontSize: 11,
          padding: "4px 10px",
          borderRadius: 3,
          border: "1px solid var(--line)",
          background: busy ? "var(--bg-2)" : "var(--bg-3)",
          color: "var(--text-1)",
          cursor: busy ? "wait" : "pointer",
        }}
      >
        {busy ? "생성 중…" : "CSV 생성"}
      </button>
      {err && (
        <span style={{ fontSize: 10, color: "var(--bad)" }} title={err}>
          실패
        </span>
      )}
    </div>
  )
}
