export function parseNumeric(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  if (!value) return 0

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function toIsoDate(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback

  return parsed.toISOString().slice(0, 10)
}

export function normalizeMetaCampaignStatus(
  status?: string | null,
  effectiveStatus?: string | null
): "active" | "paused" | "ended" {
  const raw = (effectiveStatus || status || "").toUpperCase()

  if (raw === "ACTIVE") return "active"
  if (raw === "PAUSED") return "paused"
  if (
    raw === "ARCHIVED" ||
    raw === "DELETED" ||
    raw === "COMPLETED" ||
    raw === "IN_PROCESS" ||
    raw === "CAMPAIGN_PAUSED" ||
    raw === "ADSET_PAUSED" ||
    raw === "WITH_ISSUES"
  ) {
    return "ended"
  }

  return "active"
}
