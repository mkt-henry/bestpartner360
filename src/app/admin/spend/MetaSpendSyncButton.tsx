"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type SyncAccountResult = {
  accountId?: string
  accountName?: string
  status: "success" | "partial" | "failed"
  error?: string
}

type SyncResponse = {
  error?: string
  accountResults?: SyncAccountResult[]
}

type Props = {
  brandIds: string[]
  since: string
  until: string
  label?: string
  compact?: boolean
}

function failureMessage(result: SyncResponse) {
  if (result.error) return result.error

  const failed = result.accountResults?.filter((account) => account.status === "failed") ?? []
  if (failed.length === 0) return null

  return failed
    .map((account) => `${account.accountName || account.accountId || "Meta 계정"}: ${account.error ?? "동기화 실패"}`)
    .join(" / ")
}

export default function MetaSpendSyncButton({
  brandIds,
  since,
  until,
  label = "Meta 갱신",
  compact = false,
}: Props) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function sync() {
    if (brandIds.length === 0 || syncing) return

    setSyncing(true)
    setMessage(null)

    try {
      const res = await fetch("/api/admin/sync/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandIds, since, until }),
      })
      const json = (await res.json().catch(() => ({}))) as SyncResponse
      const error = failureMessage(json)

      if (!res.ok || error) {
        setMessage(error ?? "Meta 갱신 실패")
        return
      }

      setMessage("갱신 완료")
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Meta 갱신 실패")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <button
        type="button"
        className="btn"
        onClick={sync}
        disabled={syncing || brandIds.length === 0}
        style={{
          padding: compact ? "6px 10px" : undefined,
          fontSize: compact ? 10 : undefined,
          opacity: syncing || brandIds.length === 0 ? 0.55 : 1,
        }}
      >
        {syncing ? "갱신 중..." : label}
      </button>
      {message && (
        <span
          style={{
            maxWidth: compact ? 360 : 640,
            color: message === "갱신 완료" ? "var(--good)" : "var(--bad)",
            fontSize: compact ? 10 : 11,
            lineHeight: 1.4,
          }}
        >
          {message}
        </span>
      )}
    </div>
  )
}
