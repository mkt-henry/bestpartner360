import { createClient } from "@/lib/supabase/server"
import { Share2 } from "lucide-react"
import MetaAccountMapper from "@/components/admin/MetaAccountMapper"
import type { Brand, MetaAdAccount } from "@/types"

export default async function AdminMetaPage() {
  const supabase = await createClient()

  const [{ data: brands }, { data: mappings }] = await Promise.all([
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("meta_ad_accounts").select("*, brand:brands(id, name)").order("created_at", { ascending: false }),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Share2 className="w-5 h-5 text-slate-500" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Meta 광고 계정 연결</h1>
      </div>

      <MetaAccountMapper
        brands={(brands ?? []) as Brand[]}
        initialMappings={(mappings ?? []) as MetaAdAccount[]}
      />
    </div>
  )
}
