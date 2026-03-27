import { createClient } from "@/lib/supabase/server"
import CampaignForm from "@/components/admin/CampaignForm"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

interface PageProps {
  searchParams: Promise<{ brand?: string }>
}

export default async function NewCampaignPage({ searchParams }: PageProps) {
  const { brand: defaultBrandId } = await searchParams
  const supabase = await createClient()
  const { data: brands } = await supabase.from("brands").select("id, name").order("name")

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/admin/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
      >
        <ChevronLeft className="w-4 h-4" />
        브랜드 KPI
      </Link>

      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">매체 추가</h1>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <CampaignForm brands={brands ?? []} defaultBrandId={defaultBrandId} />
      </div>
    </div>
  )
}
