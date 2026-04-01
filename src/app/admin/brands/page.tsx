import { createClient } from "@/lib/supabase/server"
import BrandForm from "@/components/admin/BrandForm"
import BrandChannelManager from "@/components/admin/BrandChannelManager"
import { Building2 } from "lucide-react"
import type { Brand, MetaAdAccount, NaverAdAccount, Ga4Property } from "@/types"

export default async function AdminBrandsPage() {
  const supabase = await createClient()

  const [
    { data: brands },
    { data: metaMappings },
    { data: naverMappings },
    { data: ga4Mappings },
  ] = await Promise.all([
    supabase.from("brands").select("id, name, created_at").order("name"),
    supabase.from("meta_ad_accounts").select("*, brand:brands(id, name)").order("created_at", { ascending: false }),
    supabase.from("naver_ad_accounts").select("*, brand:brands(id, name)").order("created_at", { ascending: false }),
    supabase.from("ga4_properties").select("*, brand:brands(id, name)").order("created_at", { ascending: false }),
  ])

  const brandList = (brands ?? []) as Brand[]
  const metaList = (metaMappings ?? []) as MetaAdAccount[]
  const naverList = (naverMappings ?? []) as NaverAdAccount[]
  const ga4List = (ga4Mappings ?? []) as Ga4Property[]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="w-5 h-5 text-slate-500" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">브랜드 관리</h1>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">새 브랜드 추가</h2>
        <BrandForm />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          브랜드 목록 ({brandList.length}개)
        </h2>
        {brandList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-8">
            <p className="text-sm text-slate-400 text-center">등록된 브랜드가 없습니다.</p>
          </div>
        ) : (
          brandList.map((brand) => (
            <BrandChannelManager
              key={brand.id}
              brand={brand}
              metaMappings={metaList.filter((m) => m.brand_id === brand.id)}
              naverMappings={naverList.filter((m) => m.brand_id === brand.id)}
              ga4Mappings={ga4List.filter((m) => m.brand_id === brand.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
