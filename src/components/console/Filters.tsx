"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

const RANGE_OPTIONS = [
  { label: "7일", value: "7" },
  { label: "14일", value: "14" },
  { label: "30일", value: "30" },
]

export function Filters({ extra }: { extra?: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentRange = searchParams.get("range") ?? "14"

  const [syncTime, setSyncTime] = useState<string>("—")
  useEffect(() => {
    setSyncTime(new Date().toLocaleTimeString("ko-KR", { hour12: false }))
  }, [])

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(key, value)
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="filters">
      <div className="filter-group">
        <span className="fg-label">기간</span>
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`chip ${currentRange === opt.value ? "on" : ""}`}
            onClick={() => updateParam("range", opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {extra}
      <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--dim)", whiteSpace: "nowrap" }}>
        마지막 동기화 <b style={{ color: "var(--text-2)" }}>{syncTime}</b>
      </div>
    </div>
  )
}
