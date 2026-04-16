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
    <div className="canvas" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{
        fontFamily: 'var(--c-serif)', fontSize: 20, fontWeight: 700,
        color: 'var(--text)', margin: '0 0 24px',
      }}>
        운영 현황
      </h1>

      {sortedDates.length === 0 ? (
        <div className="empty">
          <p>등록된 운영 현황이 없습니다.</p>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {sortedDates.map((date) => (
            <div key={date} style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: 'var(--amber)', flexShrink: 0,
                }} />
                <h2 style={{
                  fontSize: 13, fontWeight: 600,
                  color: 'var(--dim)', margin: 0,
                }}>
                  {formatDate(date)}
                </h2>
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              </div>
              <div style={{ marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {grouped[date]?.map((act) => (
                  <div
                    key={act.id}
                    style={{
                      background: 'var(--bg-1)', border: '1px solid var(--line)',
                      borderRadius: 8, padding: 20,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      {act.channel && (
                        <span className="tag">{act.channel}</span>
                      )}
                      {(act.campaigns as unknown as { name: string } | null) && (
                        <span style={{ fontSize: 12, color: 'var(--dim)' }}>
                          {(act.campaigns as unknown as { name: string }).name}
                        </span>
                      )}
                    </div>
                    <h3 style={{
                      fontSize: 14, fontWeight: 600,
                      color: 'var(--text)', margin: '0 0 6px',
                    }}>
                      {act.title}
                    </h3>
                    <p style={{
                      fontSize: 13, color: 'var(--text-2)',
                      lineHeight: 1.6, whiteSpace: 'pre-line', margin: 0,
                    }}>
                      {act.content}
                    </p>
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
