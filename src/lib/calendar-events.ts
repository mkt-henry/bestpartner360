import type { SupabaseClient } from "@supabase/supabase-js"
import type { CalendarEvent } from "@/types"

const BASE_EVENT_SELECT = `
  id, brand_id, campaign_id, title, channel, asset_type, event_date, status, description
`

const EVENT_SELECT_WITH_CREATIVES = `
  ${BASE_EVENT_SELECT},
  creatives(
    id, title, asset_type, status, description,
    creative_versions(id, version_number, file_path, file_url, uploaded_at)
  )
`

const EVENT_SELECT_WITH_CREATIVES_AND_COMMENTS = `
  ${BASE_EVENT_SELECT},
  creatives(
    id, title, asset_type, status, description,
    creative_versions(id, version_number, file_path, file_url, uploaded_at),
    creative_comments(
      id, content, created_at, user_id,
      user_profiles(full_name, role)
    )
  )
`

type CalendarEventsOptions = {
  brandIds?: string[]
  from: string
  to: string
  includeCreativeComments?: boolean
}

type QueryError = {
  code?: string | null
  message?: string | null
}

function buildCalendarEventsQuery(
  supabase: SupabaseClient,
  selectClause: string,
  options: CalendarEventsOptions,
) {
  let query = supabase
    .from("calendar_events")
    .select(selectClause)
    .gte("event_date", options.from)
    .lte("event_date", options.to)
    .order("event_date")

  if (options.brandIds) {
    query = options.brandIds.length > 0
      ? query.in("brand_id", options.brandIds)
      : query.in("brand_id", ["00000000-0000-0000-0000-000000000000"])
  }

  return query
}

function isMissingCreativesRelationError(error: QueryError | null | undefined) {
  return error?.code === "PGRST200"
    && (error.message ?? "").includes("calendar_events")
    && (error.message ?? "").includes("creatives")
}

export async function fetchCalendarEvents(
  supabase: SupabaseClient,
  options: CalendarEventsOptions,
) {
  const selectClause = options.includeCreativeComments
    ? EVENT_SELECT_WITH_CREATIVES_AND_COMMENTS
    : EVENT_SELECT_WITH_CREATIVES

  const nestedResult = await buildCalendarEventsQuery(supabase, selectClause, options)

  if (!isMissingCreativesRelationError(nestedResult.error)) {
    return {
      data: (nestedResult.data ?? null) as CalendarEvent[] | null,
      error: nestedResult.error,
      degraded: false as const,
    }
  }

  const fallbackResult = await buildCalendarEventsQuery(supabase, BASE_EVENT_SELECT, options)
  return {
    data: (fallbackResult.data ?? null) as CalendarEvent[] | null,
    error: fallbackResult.error,
    degraded: true as const,
  }
}
