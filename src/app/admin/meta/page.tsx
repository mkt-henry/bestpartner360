import { createClient } from "@/lib/supabase/server"
import MetaInsightsDashboard from "@/components/admin/MetaInsightsDashboard"
import { BarChart2, AlertCircle } from "lucide-react"
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-5 h-5 text-slate-500" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Meta 인사이트</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Facebook · Instagram 광고 성과를 확인합니다</p>
          </div>
        </div>
        <Link
          href="/admin/brands"
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          계정 관리 →
        </Link>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-12 text-center">
          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-2">연결된 Meta 광고 계정이 없습니다.</p>
          <Link href="/admin/brands" className="text-sm text-blue-600 hover:text-blue-700">
            브랜드 관리에서 Meta 계정을 연결하세요 →
          </Link>
        </div>
      ) : (
        <MetaInsightsDashboard accounts={accounts} />
      )}
    </div>
  )
}
