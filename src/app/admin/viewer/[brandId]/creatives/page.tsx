import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { STATUS_LABELS } from "@/types"
import type { CalendarEventStatus } from "@/types"

const STATUS_ORDER: CalendarEventStatus[] = [
  "review_requested",
  "feedback_pending",
  "in_revision",
  "upload_scheduled",
  "draft",
  "completed",
]

const STATUS_TAG_STYLES: Record<CalendarEventStatus, { background: string; color: string }> = {
  review_requested: { background: 'var(--amber-dim)', color: 'var(--amber)' },
  feedback_pending: { background: 'rgba(var(--bad-rgb, 239,68,68), 0.12)', color: 'var(--bad)' },
  in_revision: { background: 'rgba(var(--plum-rgb, 168,85,247), 0.12)', color: 'var(--plum)' },
  upload_scheduled: { background: 'rgba(var(--steel-rgb, 100,116,139), 0.12)', color: 'var(--steel)' },
  draft: { background: 'var(--bg-2)', color: 'var(--dim)' },
  completed: { background: 'rgba(var(--good-rgb, 34,197,94), 0.12)', color: 'var(--good)' },
}

const ASSET_LABELS: Record<string, string> = {
  image: "이미지",
  video: "비디오",
  banner: "배너",
  other: "기타",
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
    <div className="canvas" style={{ maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{
        fontFamily: 'var(--c-serif)', fontSize: 20, fontWeight: 700,
        color: 'var(--text)', margin: '0 0 24px',
      }}>
        소재 관리
      </h1>

      {Object.keys(grouped).length === 0 ? (
        <div className="empty">
          <p>등록된 소재가 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(grouped).map(([status, items]) => {
            const tagStyle = STATUS_TAG_STYLES[status as CalendarEventStatus]
            return (
              <div key={status}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span
                    className="tag"
                    style={{ background: tagStyle.background, color: tagStyle.color }}
                  >
                    {STATUS_LABELS[status as CalendarEventStatus]}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--dim)' }}>{items?.length}건</span>
                </div>
                <div className="card-grid cols-4">
                  {items?.map((creative) => {
                    const versions = creative.creative_versions as { id: string; version_number: number; file_url: string }[] | null
                    const latestVersion = versions?.sort((a, b) => b.version_number - a.version_number)[0]
                    return (
                      <Link
                        key={creative.id}
                        href={`/dashboard/creatives/${creative.id}`}
                        style={{
                          background: 'var(--bg-1)', border: '1px solid var(--line)',
                          borderRadius: 8, overflow: 'hidden', display: 'block',
                          textDecoration: 'none', color: 'inherit',
                        }}
                      >
                        <div style={{
                          aspectRatio: '16/9', background: 'var(--bg-2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          position: 'relative', overflow: 'hidden',
                        }}>
                          {latestVersion?.file_url ? (
                            creative.asset_type === "image" || creative.asset_type === "banner" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={latestVersion.file_url}
                                alt={creative.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 12, color: 'var(--dim)' }}>
                                  {ASSET_LABELS[creative.asset_type] ?? creative.asset_type}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--dimmer)' }}>미리보기 없음</span>
                              </div>
                            )
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 12, color: 'var(--dim)' }}>
                                {ASSET_LABELS[creative.asset_type] ?? creative.asset_type}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--dimmer)' }}>소재 없음</span>
                            </div>
                          )}
                        </div>
                        <div style={{ padding: 12 }}>
                          <p style={{
                            fontSize: 13, fontWeight: 500, color: 'var(--text)',
                            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {creative.title}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            {creative.channel && (
                              <span className="tag neutral">{creative.channel}</span>
                            )}
                            {versions && versions.length > 0 && (
                              <span style={{ fontSize: 11, color: 'var(--dim)' }}>v{versions[0].version_number}</span>
                            )}
                          </div>
                          {creative.scheduled_date && (
                            <p style={{ fontSize: 11, color: 'var(--dim)', margin: '4px 0 0' }}>
                              {creative.scheduled_date}
                            </p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
