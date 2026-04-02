import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Eye, Building2, ArrowRight } from "lucide-react"
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Eye className="w-5 h-5 text-slate-500" />
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">파트너 뷰어</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">브랜드를 선택하면 파트너 관점의 대시보드를 확인할 수 있습니다.</p>
        </div>
      </div>

      {brandList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-12 text-center">
          <p className="text-sm text-slate-400">등록된 브랜드가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {brandList.map((brand) => (
            <Link
              key={brand.id}
              href={`/admin/viewer/${brand.id}`}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{brand.name}</p>
                    <p className="text-xs text-slate-400">
                      뷰어 {viewerCountMap[brand.id] ?? 0}명
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
