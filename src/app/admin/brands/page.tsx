import { createClient } from "@/lib/supabase/server"
import BrandForm from "@/components/admin/BrandForm"
import { Building2 } from "lucide-react"

export default async function AdminBrandsPage() {
  const supabase = await createClient()
  const { data: brands } = await supabase
    .from("brands")
    .select("id, name, created_at")
    .order("created_at", { ascending: false })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="w-5 h-5 text-slate-500" />
        <h1 className="text-xl font-bold text-slate-900">브랜드 관리</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">새 브랜드 추가</h2>
        <BrandForm />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">브랜드 목록</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {brands?.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">등록된 브랜드가 없습니다.</p>
          ) : (
            brands?.map((b) => (
              <div key={b.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <p className="text-sm font-medium text-slate-900">{b.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">ID: {b.id.slice(0, 8)}...</p>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(b.created_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
