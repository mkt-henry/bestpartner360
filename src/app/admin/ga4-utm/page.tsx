import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { TrendingUp } from "lucide-react"
import Ga4UtmManager from "@/components/admin/Ga4UtmManager"
import type { Brand } from "@/types"

interface PageProps {
  searchParams: Promise<{ brand?: string }>
}

export default async function AdminGa4UtmPage({ searchParams }: PageProps) {
  const { brand: selectedBrandId } = await searchParams
  const supabase = await createClient()

  const { data: brands } = await supabase.from("brands").select("id, name").order("name")
  const activeBrandId = selectedBrandId ?? brands?.[0]?.id ?? ""

  // UTM 항목 + 성과 데이터
  const { data: utmEntries } = await supabase
    .from("ga4_utm_entries")
    .select("*")
    .eq("brand_id", activeBrandId)
    .order("created_at", { ascending: false })

  const entryIds = utmEntries?.map((e) => e.id) ?? []

  const { data: perfData } = entryIds.length > 0
    ? await supabase
        .from("ga4_utm_performance")
        .select("*")
        .in("utm_entry_id", entryIds)
        .order("record_date", { ascending: false })
    : { data: [] }

  const entriesWithPerf = (utmEntries ?? []).map((e) => ({
    ...e,
    performance: (perfData ?? []).filter((p) => p.utm_entry_id === e.id),
  }))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">GA4 UTM 관리</h1>
      </div>

      {brands && brands.length > 0 ? (
        <>
          <div className="flex gap-1 flex-wrap">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/admin/ga4-utm?brand=${brand.id}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  brand.id === activeBrandId
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300"
                }`}
              >
                {brand.name}
              </Link>
            ))}
          </div>

          <Ga4UtmManager
            key={activeBrandId}
            brandId={activeBrandId}
            brands={(brands ?? []) as Brand[]}
            entries={entriesWithPerf}
          />
        </>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <p className="text-sm text-slate-400 mb-3">먼저 브랜드를 등록해주세요.</p>
          <Link href="/admin/brands" className="text-sm text-blue-600 hover:text-blue-700 font-medium">브랜드 관리 →</Link>
        </div>
      )}
    </div>
  )
}
