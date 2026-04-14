"use client"

import { useState } from "react"

export function TabGroup({
  tabs,
  initial,
  onChange,
}: {
  tabs: string[]
  initial: string
  onChange?: (tab: string) => void
}) {
  const [active, setActive] = useState(initial)
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button
          key={t}
          className={active === t ? "on" : undefined}
          onClick={() => {
            setActive(t)
            onChange?.(t)
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}
