import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { parseBrandIds } from "@/lib/brand-media"
import MetaInsightsDashboard from "@/components/admin/MetaInsightsDashboard"

export default async function DashboardMetaPage() {
  const h = await headers()
  const brandIds = parseBrandIds(h.get("x-user-brand-ids"))

  const supabase = await createClient()

  let accounts: Array<{
    id: string
    brand_id: string
    meta_account_id: string
    meta_account_name: string
    brand?: { id: string; name: string }
  }> = []

  if (brandIds.length > 0) {
    const { data: metaAccounts } = await supabase
      .from("meta_ad_accounts")
      .select("id, brand_id, meta_account_id, meta_account_name, brand:brands(id, name)")
      .in("brand_id", brandIds)
      .order("created_at", { ascending: false })

    accounts = (metaAccounts ?? []).map((a) => ({
      ...a,
      brand: Array.isArray(a.brand) ? a.brand[0] : a.brand,
    }))
  }

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1>Meta <em>인사이트</em></h1>
          <p className="sub">Facebook · Instagram 광고 성과</p>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <p>연결된 Meta 광고 계정이 없습니다.</p>
          </div>
        </div>
      ) : (
        <MetaInsightsDashboard accounts={accounts} hideAccountSelector />
      )}
    </div>
  )
}
