import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import type { Brand } from "@/types"

export default async function AdminViewerPage() {
  const supabase = await createClient()

  const { data: brands } = await supabase
    .from("brands")
    .select("id, name, created_at")
    .order("name")

  const brandList = (brands ?? []) as Brand[]

  // 브랜드별 뷰어 계정 수 조회
  const { data: accessCounts } = await supabase
    .from("user_brand_access")
    .select("brand_id, user_id")

  const viewerCountMap: Record<string, number> = {}
  for (const access of accessCounts ?? []) {
    viewerCountMap[access.brand_id] = (viewerCountMap[access.brand_id] ?? 0) + 1
  }

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1>파트너 <em>뷰어</em></h1>
          <p className="sub">브랜드를 선택하면 파트너 관점의 대시보드를 확인할 수 있습니다.</p>
        </div>
      </div>

      {brandList.length === 0 ? (
        <div className="panel">
          <div className="empty">등록된 브랜드가 없습니다.</div>
        </div>
      ) : (
        <div className="card-grid cols-2">
          {brandList.map((brand) => (
            <Link key={brand.id} href={`/admin/viewer/${brand.id}`} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                background: "var(--grad)",
                display: "grid", placeItems: "center",
                color: "var(--bg)", fontFamily: "var(--c-serif)", fontSize: 16, fontWeight: 600,
                flexShrink: 0,
              }}>
                {brand.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="card-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{brand.name}</div>
                <div className="card-sub">뷰어 {viewerCountMap[brand.id] ?? 0}명</div>
              </div>
              <span style={{ color: "var(--dim)", fontSize: 14, flexShrink: 0 }}>▶</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
