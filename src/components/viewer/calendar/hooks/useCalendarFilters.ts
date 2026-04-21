// src/components/viewer/calendar/hooks/useCalendarFilters.ts
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  buildSearchParams, parseSearchParams,
  type CalendarFilters, type CalendarUrlState, type ViewMode,
} from "../lib/calendar-utils"

export interface UseCalendarFiltersReturn {
  view: ViewMode
  date: Date
  filters: CalendarFilters
  setView: (v: ViewMode) => void
  setDate: (d: Date) => void
  setFilters: (updater: (prev: CalendarFilters) => CalendarFilters) => void
  setQueryInput: (q: string) => void
  queryInput: string
  reset: () => void
}

export function useCalendarFilters(today: Date): UseCalendarFiltersReturn {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initial = useMemo<CalendarUrlState>(
    () => parseSearchParams(new URLSearchParams(searchParams?.toString() ?? ""), today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const [view, setViewState] = useState<ViewMode>(initial.view)
  const [date, setDateState] = useState<Date>(initial.date)
  const [filters, setFiltersState] = useState<CalendarFilters>(initial.filters)
  const [queryInput, setQueryInputState] = useState<string>(initial.filters.query)

  const pushUrl = useCallback(
    (next: CalendarUrlState) => {
      const sp = buildSearchParams(next)
      const qs = sp.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname]
  )

  const setView = useCallback((v: ViewMode) => {
    setViewState(v)
    pushUrl({ view: v, date, filters })
  }, [date, filters, pushUrl])

  const setDate = useCallback((d: Date) => {
    setDateState(d)
    pushUrl({ view, date: d, filters })
  }, [view, filters, pushUrl])

  const setFilters = useCallback(
    (updater: (prev: CalendarFilters) => CalendarFilters) => {
      setFiltersState((prev) => {
        const next = updater(prev)
        pushUrl({ view, date, filters: next })
        return next
      })
    },
    [view, date, pushUrl]
  )

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setQueryInput = useCallback((q: string) => {
    setQueryInputState(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFiltersState((prev) => {
        const next = { ...prev, query: q }
        pushUrl({ view, date, filters: next })
        return next
      })
    }, 200)
  }, [view, date, pushUrl])

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const reset = useCallback(() => {
    const empty: CalendarFilters = {
      channels: new Set(), statuses: new Set(), assetTypes: new Set(), query: "",
    }
    setFiltersState(empty)
    setQueryInputState("")
    pushUrl({ view, date, filters: empty })
  }, [view, date, pushUrl])

  return { view, date, filters, setView, setDate, setFilters, setQueryInput, queryInput, reset }
}
