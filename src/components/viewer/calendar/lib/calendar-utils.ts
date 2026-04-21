// src/components/viewer/calendar/lib/calendar-utils.ts
import {
  addDays, addMonths, addWeeks, differenceInCalendarDays,
  endOfMonth, endOfWeek, format, getDay, getDaysInMonth,
  getISOWeek, isSameMonth, parseISO, startOfMonth, startOfWeek,
} from "date-fns"
import type { CalendarEvent, CalendarEventStatus } from "@/types"

export type ViewMode = "month" | "week" | "list"

export interface CalendarFilters {
  channels: Set<string>
  statuses: Set<string>
  assetTypes: Set<string>
  query: string
}

export const EMPTY_FILTERS: CalendarFilters = {
  channels: new Set(),
  statuses: new Set(),
  assetTypes: new Set(),
  query: "",
}

export const UNASSIGNED = "__unassigned__"

export const CHANNEL_COLORS: Record<string, string> = {
  Meta: "#1877F2",
  Facebook: "#1877F2",
  Instagram: "#E1306C",
  Google: "#4285F4",
  Naver: "#03c75a",
  Kakao: "#FEE500",
  TikTok: "#ff0040",
  YouTube: "#FF0000",
  GA4: "#FBBC05",
}

export function channelTagClass(channel: string | null): string {
  if (!channel) return "tag neutral"
  const key = channel.toLowerCase()
  const known = ["meta", "instagram", "facebook", "google", "naver", "kakao", "tiktok", "youtube", "ga4"]
  return known.includes(key) ? `tag ${key}` : "tag neutral"
}

export function channelColor(channel: string | null): string {
  if (!channel) return "var(--dimmer)"
  return CHANNEL_COLORS[channel] ?? "var(--dim)"
}

const STATUS_ORDER: CalendarEventStatus[] = [
  "review_requested",
  "feedback_pending",
  "in_revision",
  "upload_scheduled",
  "completed",
  "draft",
]

export function statusPriority(status: string): number {
  const idx = STATUS_ORDER.indexOf(status as CalendarEventStatus)
  return idx === -1 ? 999 : idx
}

export const STATUS_DOT_COLOR: Record<string, string> = {
  draft: "var(--dimmer)",
  review_requested: "var(--steel)",
  feedback_pending: "var(--amber)",
  in_revision: "#e08a5a",
  upload_scheduled: "var(--plum)",
  completed: "var(--good)",
}

export function groupEventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const out: Record<string, CalendarEvent[]> = {}
  for (const ev of events) {
    const key = ev.event_date
    if (!out[key]) out[key] = []
    out[key].push(ev)
  }
  for (const key of Object.keys(out)) {
    out[key].sort((a, b) => statusPriority(a.status) - statusPriority(b.status))
  }
  return out
}

export function applyFilters(events: CalendarEvent[], f: CalendarFilters): CalendarEvent[] {
  const q = f.query.trim().toLowerCase()
  return events.filter((ev) => {
    if (f.channels.size > 0) {
      const key = ev.channel ?? UNASSIGNED
      if (!f.channels.has(key)) return false
    }
    if (f.statuses.size > 0 && !f.statuses.has(ev.status)) return false
    if (f.assetTypes.size > 0) {
      const key = ev.asset_type ?? UNASSIGNED
      if (!f.assetTypes.has(key)) return false
    }
    if (q && !ev.title.toLowerCase().includes(q)) return false
    return true
  })
}

export function distinctValues(events: CalendarEvent[], key: "channel" | "asset_type"): string[] {
  const set = new Set<string>()
  for (const ev of events) {
    const v = ev[key]
    set.add(v ?? UNASSIGNED)
  }
  return Array.from(set).sort((a, b) => {
    if (a === UNASSIGNED) return 1
    if (b === UNASSIGNED) return -1
    return a.localeCompare(b, "ko")
  })
}

export function getVisibleRange(date: Date, view: ViewMode): { from: Date; to: Date } {
  if (view === "month") {
    return { from: startOfMonth(date), to: endOfMonth(date) }
  }
  if (view === "week") {
    return { from: startOfWeek(date, { weekStartsOn: 0 }), to: endOfWeek(date, { weekStartsOn: 0 }) }
  }
  // list: 전체 로드된 범위. 호출자가 events 기준으로 판단.
  return { from: date, to: date }
}

export function getMonthCells(date: Date): (Date | null)[] {
  const first = startOfMonth(date)
  const daysInMonth = getDaysInMonth(date)
  const leading = getDay(first) // 0=Sun..6=Sat
  const cells: (Date | null)[] = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(date.getFullYear(), date.getMonth(), d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 0 })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function getRelativeDateLabel(date: Date, today: Date): string | null {
  const diff = differenceInCalendarDays(date, today)
  if (diff === 0) return "오늘"
  if (diff === 1) return "내일"
  if (diff === -1) return "어제"
  if (diff > 1 && diff <= 3) return `${diff}일 후`
  if (diff < -1 && diff >= -3) return `${-diff}일 전`
  return null
}

export function isInLoadedRange(date: Date, events: CalendarEvent[]): boolean {
  if (events.length === 0) return true
  let minD = events[0].event_date
  let maxD = events[0].event_date
  for (const ev of events) {
    if (ev.event_date < minD) minD = ev.event_date
    if (ev.event_date > maxD) maxD = ev.event_date
  }
  const min = startOfMonth(parseISO(minD))
  const max = endOfMonth(parseISO(maxD))
  return date >= min && date <= max
}

export function formatDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

export function formatMonthTitle(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
}

export function formatWeekTitle(date: Date): string {
  const start = startOfWeek(date, { weekStartsOn: 0 })
  const end = endOfWeek(date, { weekStartsOn: 0 })
  const weekNum = getISOWeek(date)
  if (isSameMonth(start, end)) {
    return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 – ${end.getDate()}일 (${weekNum}주차)`
  }
  return `${start.getFullYear()}.${start.getMonth() + 1}.${start.getDate()} – ${end.getMonth() + 1}.${end.getDate()} (${weekNum}주차)`
}

export function stepDate(date: Date, view: ViewMode, direction: 1 | -1): Date {
  if (view === "month") return addMonths(date, direction)
  if (view === "week") return addWeeks(date, direction)
  return addMonths(date, direction)
}

// ─── URL serialization ─────────────────────────────────────────
export interface CalendarUrlState {
  view: ViewMode
  date: Date
  filters: CalendarFilters
}

const VIEW_SET: ReadonlySet<ViewMode> = new Set(["month", "week", "list"])

export function parseSearchParams(sp: URLSearchParams, today: Date): CalendarUrlState {
  const rawView = sp.get("view")
  const view: ViewMode = VIEW_SET.has(rawView as ViewMode) ? (rawView as ViewMode) : "month"
  const rawDate = sp.get("date")
  let date = today
  if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const parsed = parseISO(rawDate)
    if (!isNaN(parsed.getTime())) date = parsed
  }
  const toSet = (s: string | null) =>
    new Set(s ? s.split(",").filter(Boolean) : [])
  const filters: CalendarFilters = {
    channels: toSet(sp.get("channels")),
    statuses: toSet(sp.get("statuses")),
    assetTypes: toSet(sp.get("types")),
    query: sp.get("q") ?? "",
  }
  return { view, date, filters }
}

export function buildSearchParams(state: CalendarUrlState): URLSearchParams {
  const sp = new URLSearchParams()
  if (state.view !== "month") sp.set("view", state.view)
  sp.set("date", formatDateKey(state.date))
  if (state.filters.channels.size > 0) sp.set("channels", Array.from(state.filters.channels).join(","))
  if (state.filters.statuses.size > 0) sp.set("statuses", Array.from(state.filters.statuses).join(","))
  if (state.filters.assetTypes.size > 0) sp.set("types", Array.from(state.filters.assetTypes).join(","))
  if (state.filters.query) sp.set("q", state.filters.query)
  return sp
}

export function countActiveFilters(f: CalendarFilters): number {
  let n = 0
  if (f.channels.size > 0) n++
  if (f.statuses.size > 0) n++
  if (f.assetTypes.size > 0) n++
  if (f.query.trim()) n++
  return n
}

export function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}
