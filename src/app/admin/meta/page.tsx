import { createClient } from "@/lib/supabase/server"
import MetaInsightsDashboard from "@/components/admin/MetaInsightsDashboard"
import Link from "next/link"

export default async function AdminMetaPage() {
  const supabase = await createClient()

  const { data: metaAccounts } = await supabase
    .from("meta_ad_accounts")
    .select("id, brand_id, meta_account_id, meta_account_name, brand:brands(id, name)")
    .order("created_at", { ascending: false })

  // Supabase returns joined brand as array — flatten to single object
  const accounts = (metaAccounts ?? []).map((a) => ({
    ...a,
    brand: Array.isArray(a.brand) ? a.brand[0] : a.brand,
  }))

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1>Meta <em>Insights</em></h1>
          <p className="sub">Facebook · Instagram 광고 성과</p>
        </div>
        <Link href="/admin/brands" className="btn">계정 관리 →</Link>
      </div>

      {accounts.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <p style={{ marginBottom: 8 }}>연결된 Meta 광고 계정이 없습니다.</p>
            <Link href="/admin/brands" className="btn" style={{ display: "inline-flex" }}>
              브랜드 관리에서 Meta 계정을 연결하세요 →
            </Link>
          </div>
        </div>
      ) : (
        <MetaInsightsDashboard accounts={accounts} />
      )}
    </div>
  )
}
