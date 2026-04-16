import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { STATUS_LABELS } from "@/types"
import type { CalendarEventStatus } from "@/types"
import { Topbar, FooterBar } from "@/components/console/Topbar"

const STATUS_ORDER: CalendarEventStatus[] = [
  "review_requested",
  "feedback_pending",
  "in_revision",
  "upload_scheduled",
  "draft",
  "completed",
]

type Creative = {
  id: string
  title: string
  channel: string | null
  asset_type: string
  status: string
  description: string | null
  scheduled_date: string | null
  creative_versions: { id: string; version_number: number; file_url: string }[] | null
}

export default async function CreativesPage() {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandIdsHeader = h.get("x-user-brand-ids")
  if (!userId) redirect("/login")

  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []

  const supabase = await createClient()
  const { data: creativesRaw } = await supabase
    .from("creatives")
    .select(`
      id, title, channel, asset_type, status, description, scheduled_date,
      creative_versions(id, version_number, file_url)
    `)
    .in("brand_id", brandIds)
    .order("created_at", { ascending: false })

  const creatives = (creativesRaw ?? []) as unknown as Creative[]

  const grouped: Record<string, Creative[]> = {}
  for (const status of STATUS_ORDER) {
    const items = creatives.filter((c) => c.status === status)
    if (items.length > 0) grouped[status] = items
  }

  return (
    <>
      <Topbar crumbs={[{ label: "워크스페이스" }, { label: "소재", strong: true }]} />
      <div className="canvas">
        <div className="page-head">
          <div>
            <h1>
              소재 <em>관리</em>
            </h1>
            <div className="sub">{creatives.length}건</div>
          </div>
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div className="panel">
            <div className="p-body" style={{ padding: 40, textAlign: "center", color: "var(--dim)" }}>
              등록된 소재가 없습니다.
            </div>
          </div>
        ) : (
          Object.entries(grouped).map(([status, items]) => (
            <div key={status} className="panel">
              <div className="p-head">
                <h3>{STATUS_LABELS[status as CalendarEventStatus]}</h3>
                <div className="sub">{items.length}건</div>
              </div>
              <div className="p-body">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: 12,
                  }}
                >
                  {items.map((creative) => {
                    const versions = creative.creative_versions
                    const latestVersion = versions?.sort((a, b) => b.version_number - a.version_number)[0]
                    return (
                      <Link
                        key={creative.id}
                        href={`/dashboard/creatives/${creative.id}`}
                        style={{
                          display: "block",
                          background: "var(--bg-2)",
                          border: "1px solid var(--line)",
                          borderRadius: 6,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            aspectRatio: "16/9",
                            background: "var(--bg-3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                          }}
                        >
                          {latestVersion?.file_url && (creative.asset_type === "image" || creative.asset_type === "banner") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={latestVersion.file_url}
                              alt={creative.title}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <span style={{ fontSize: 10, color: "var(--dim)" }}>미리보기 없음</span>
                          )}
                        </div>
                        <div style={{ padding: 10 }}>
                          <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {creative.title}
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 6, fontSize: 10, color: "var(--dim)" }}>
                            {creative.channel && <span>{creative.channel}</span>}
                            {versions && versions.length > 0 && <span>v{versions[0]!.version_number}</span>}
                            {creative.scheduled_date && <span>· {creative.scheduled_date}</span>}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <FooterBar />
    </>
  )
}
