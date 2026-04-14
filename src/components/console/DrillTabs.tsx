"use client"

import { useState } from "react"

type Tab = {
  label: string
  count?: string
  id: string
}

export function DrillTabs({
  tabs,
  initial,
  onChange,
}: {
  tabs: Tab[]
  initial: string
  onChange?: (id: string) => void
}) {
  const [active, setActive] = useState(initial)
  return (
    <div className="drill-tabs">
      {tabs.map((t) => (
        <a
          key={t.id}
          className={active === t.id ? "on" : undefined}
          href="#"
          onClick={(e) => {
            e.preventDefault()
            setActive(t.id)
            onChange?.(t.id)
          }}
        >
          {t.label}
          {t.count && <span className="c">{t.count}</span>}
        </a>
      ))}
    </div>
  )
}
