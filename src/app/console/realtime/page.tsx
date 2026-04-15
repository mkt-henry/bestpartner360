import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Topbar, FooterBar } from "../_components/Topbar"
import { RealtimeContent } from "./RealtimeContent"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function RealtimePage() {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandIdsHeader = h.get("x-user-brand-ids")
  const brandName = h.get("x-user-brand-name")
    ? decodeURIComponent(h.get("x-user-brand-name")!)
    : "Brand"

  if (!userId) redirect("/login")
  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []

  const supabase = await createClient()
  const { data: props } = brandIds.length
    ? await supabase
        .from("ga4_properties")
        .select("property_id, website_url")
        .in("brand_id", brandIds)
        .limit(1)
    : { data: null }

  const prop = props?.[0] ?? null

  return (
    <>
      <Topbar
        crumbs={[
          { label: "Workspace" },
          { label: brandName },
          { label: "Realtime", strong: true },
        ]}
      />

      <div className="detail-head">
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic" style={{ background: "#5ec27a20", color: "#5EC27A" }}>◉</span>
              <span>
                {prop
                  ? `GA4 · ${prop.website_url ?? ""} · Property ${prop.property_id}`
                  : "GA4 Realtime · (property 미연결)"}
              </span>
            </div>
            <h1>
              Realtime <em>monitor</em>
            </h1>
            <div className="dh-meta">
              <span className="live-pill">Live · streaming</span>
              <span>Auto refresh · 10s</span>
            </div>
          </div>
        </div>
      </div>

      <div className="canvas">
        {prop ? (
          <RealtimeContent />
        ) : (
          <div className="panel">
            <div className="p-body" style={{ padding: 40, textAlign: "center", color: "var(--dim)" }}>
              GA4 Property가 연결되지 않아 실시간 데이터를 표시할 수 없습니다.
            </div>
          </div>
        )}
      </div>

      <FooterBar />
    </>
  )
}
