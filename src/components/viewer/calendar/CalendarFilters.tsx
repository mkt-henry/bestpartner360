// src/components/viewer/calendar/CalendarFilters.tsx
"use client"

import { Search } from "lucide-react"
import { STATUS_LABELS } from "@/types"
import type { CalendarEventStatus } from "@/types"
import {
  countActiveFilters, UNASSIGNED,
  type CalendarFilters,
} from "./lib/calendar-utils"

const STATUS_ORDER: CalendarEventStatus[] = [
  "draft", "saved", "in_review", "in_revision", "scheduled", "published", "cancelled",
]

interface CalendarFiltersProps {
  filters: CalendarFilters
  channelOptions: string[]
  statusOptions: string[]
  assetTypeOptions: string[]
  labelOptions: string[]
  queryInput: string
  onToggleChannel: (v: string) => void
  onToggleStatus: (v: string) => void
  onToggleAssetType: (v: string) => void
  onToggleLabel: (v: string) => void
  onQueryInputChange: (q: string) => void
  onReset: () => void
}

export default function CalendarFilters({
  filters,
  channelOptions, statusOptions, assetTypeOptions, labelOptions,
  queryInput,
  onToggleChannel, onToggleStatus, onToggleAssetType, onToggleLabel,
  onQueryInputChange, onReset,
}: CalendarFiltersProps) {
  const activeCount = countActiveFilters(filters)

  const sortedStatuses = STATUS_ORDER.filter((s) => statusOptions.includes(s))

  return (
    <div className="cal-filters" style={{
      display: "flex",
      flexDirection: "column",
      gap: 12,
      padding: "14px 18px",
      background: "var(--bg-1)",
      border: "1px solid var(--line)",
      borderRadius: 8,
    }}>
      {channelOptions.length > 0 && (
        <FilterRow label="채널">
          {channelOptions.map((v) => (
            <Chip
              key={v}
              label={v === UNASSIGNED ? "미지정" : v}
              active={filters.channels.has(v)}
              onClick={() => onToggleChannel(v)}
            />
          ))}
        </FilterRow>
      )}

      {sortedStatuses.length > 0 && (
        <FilterRow label="상태">
          {sortedStatuses.map((s) => (
            <Chip
              key={s}
              label={STATUS_LABELS[s]}
              active={filters.statuses.has(s)}
              onClick={() => onToggleStatus(s)}
            />
          ))}
        </FilterRow>
      )}

      {assetTypeOptions.filter((v) => v !== UNASSIGNED).length > 0 && (
        <FilterRow label="소재">
          {assetTypeOptions.filter((v) => v !== UNASSIGNED).map((v) => (
            <Chip
              key={v}
              label={v}
              active={filters.assetTypes.has(v)}
              onClick={() => onToggleAssetType(v)}
            />
          ))}
        </FilterRow>
      )}

      {labelOptions.length > 0 && (
        <FilterRow label="라벨">
          {labelOptions.map((v) => (
            <Chip
              key={v}
              label={v}
              active={filters.labels.has(v)}
              onClick={() => onToggleLabel(v)}
            />
          ))}
        </FilterRow>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          border: "1px solid var(--line)",
          background: "var(--bg-2)",
          borderRadius: 6,
          fontSize: 13,
        }}>
          <Search style={{ width: 13, height: 13, color: "var(--dim)" }} />
          <input
            type="text"
            value={queryInput}
            onChange={(e) => onQueryInputChange(e.target.value)}
            placeholder="제목 검색"
            style={{
              flex: 1,
              background: "transparent",
              border: 0,
              color: "var(--text)",
              outline: "none",
              font: "inherit",
              fontSize: 13,
            }}
          />
          {queryInput && (
            <button
              onClick={() => onQueryInputChange("")}
              aria-label="검색어 지우기"
              style={{ color: "var(--dim)", fontSize: 10 }}
            >
              ×
            </button>
          )}
        </div>
        <button
          className="btn"
          onClick={onReset}
          disabled={activeCount === 0}
          style={{
            opacity: activeCount === 0 ? 0.45 : 1,
            cursor: activeCount === 0 ? "default" : "pointer",
          }}
        >
          필터 초기화 {activeCount > 0 ? `(${activeCount})` : ""}
        </button>
      </div>
    </div>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <span className="fg-label" style={{
        fontSize: 11,
        color: "var(--dim)",
        textTransform: "uppercase",
        letterSpacing: ".12em",
        minWidth: 32,
      }}>{label}</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={active ? "chip on" : "chip"}
    >
      {label}
    </button>
  )
}
