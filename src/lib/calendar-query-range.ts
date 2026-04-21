import { addMonths, endOfMonth, format, isValid, parseISO, startOfMonth, subMonths } from "date-fns"

function normalizeDateParam(dateParam?: string | string[]): string | undefined {
  if (Array.isArray(dateParam)) {
    return dateParam[0]
  }
  return dateParam
}

export function getCalendarQueryRange(dateParam?: string | string[]) {
  const rawDate = normalizeDateParam(dateParam)
  let anchorDate = new Date()

  if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const parsed = parseISO(rawDate)
    if (isValid(parsed)) {
      anchorDate = parsed
    }
  }

  return {
    anchorDate,
    from: format(startOfMonth(subMonths(anchorDate, 1)), "yyyy-MM-dd"),
    to: format(endOfMonth(addMonths(anchorDate, 2)), "yyyy-MM-dd"),
  }
}
