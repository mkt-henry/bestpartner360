import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Image, Video, FileImage } from "lucide-react"
import { STATUS_LABELS, STATUS_COLORS } from "@/types"
import type { CalendarEventStatus } from "@/types"
import { cn } from "@/lib/utils"

const STATUS_ORDER: CalendarEventStatus[] = [
  "review_requested",
  "feedback_pending",
  "in_revision",
  "upload_scheduled",
  "draft",
  "completed",
]

const ASSET_ICONS: Record<string, React.ReactNode> = {
  image: <Image className="w-5 h-5 text-slate-400" />,
  video: <Video className="w-5 h-5 text-slate-400" />,
  banner: <FileImage className="w-5 h-5 text-slate-400" />,
  other: <FileImage className="w-5 h-5 text-slate-400" />,
}

export default async function AdminViewerCreativesPage({
  params,
}: {
  params: Promise<{ brandId: string }>
}) {
  const { brandId } = await params
  const brandIds = [brandId]

  const supabase = await createClient()
  const { data: creatives } = await supabase
    .from("creatives")
    .select(`
      id, title, channel, asset_type, status, description, scheduled_date,
      creative_versions(id, version_number, file_url)
    `)
    .in("brand_id", brandIds)
    .order("created_at", { ascending: false })

  const grouped: Record<string, typeof creatives> = {}
  for (const status of STATUS_ORDER) {
    const items = creatives?.filter((c) => c.status === status) ?? []
    if (items.length > 0) grouped[status] = items
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">소재 관리</h1>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p>등록된 소재가 없습니다.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([status, items]) => (
          <div key={status}>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", STATUS_COLORS[status as CalendarEventStatus])}>
                {STATUS_LABELS[status as CalendarEventStatus]}
              </span>
              <span className="text-xs text-slate-400">{items?.length}건</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {items?.map((creative) => {
                const versions = creative.creative_versions as { id: string; version_number: number; file_url: string }[] | null
                const latestVersion = versions?.sort((a, b) => b.version_number - a.version_number)[0]
                return (
                  <Link
                    key={creative.id}
                    href={`/dashboard/creatives/${creative.id}`}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition group"
                  >
                    <div className="aspect-video bg-slate-100 dark:bg-slate-700 flex items-center justify-center relative overflow-hidden">
                      {latestVersion?.file_url ? (
                        creative.asset_type === "image" || creative.asset_type === "banner" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={latestVersion.file_url} alt={creative.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            {ASSET_ICONS[creative.asset_type]}
                            <span className="text-xs text-slate-400">미리보기 없음</span>
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          {ASSET_ICONS[creative.asset_type]}
                          <span className="text-xs text-slate-400">소재 없음</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{creative.title}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {creative.channel && (
                          <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">{creative.channel}</span>
                        )}
                        {versions && versions.length > 0 && (
                          <span className="text-xs text-slate-400">v{versions[0].version_number}</span>
                        )}
                      </div>
                      {creative.scheduled_date && (
                        <p className="text-xs text-slate-400 mt-1">{creative.scheduled_date}</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
