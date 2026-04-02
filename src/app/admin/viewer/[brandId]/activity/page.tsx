import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/utils"

export default async function AdminViewerActivityPage({
  params,
}: {
  params: Promise<{ brandId: string }>
}) {
  const { brandId } = await params
  const brandIds = [brandId]

  const supabase = await createClient()
  const { data: activities } = await supabase
    .from("activities")
    .select("id, title, content, channel, activity_date, campaigns(name)")
    .in("brand_id", brandIds)
    .order("activity_date", { ascending: false })

  const grouped: Record<string, typeof activities> = {}
  for (const act of activities ?? []) {
    const key = act.activity_date
    if (!grouped[key]) grouped[key] = []
    grouped[key]!.push(act)
  }

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">운영 현황</h1>

      {sortedDates.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p>등록된 운영 현황이 없습니다.</p>
        </div>
      ) : (
        <div className="relative">
          {sortedDates.map((date) => (
            <div key={date} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-blue-600 flex-shrink-0" />
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatDate(date)}</h2>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="ml-6 space-y-3">
                {grouped[date]?.map((act) => (
                  <div key={act.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-sm transition">
                    <div className="flex items-center gap-2 mb-2">
                      {act.channel && (
                        <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded font-medium">
                          {act.channel}
                        </span>
                      )}
                      {(act.campaigns as unknown as { name: string } | null) && (
                        <span className="text-xs text-slate-400">
                          {(act.campaigns as unknown as { name: string }).name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5">{act.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">{act.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
