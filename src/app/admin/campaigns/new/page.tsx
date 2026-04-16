import { createClient } from "@/lib/supabase/server"
import CampaignForm from "@/components/admin/CampaignForm"
import Link from "next/link"

interface PageProps {
  searchParams: Promise<{ brand?: string }>
}

export default async function NewCampaignPage({ searchParams }: PageProps) {
  const { brand: defaultBrandId } = await searchParams
  const supabase = await createClient()
  const { data: brands } = await supabase.from("brands").select("id, name").order("name")

  return (
    <div className="console-scope canvas">
      <Link href="/admin/campaigns" className="back">브랜드 KPI</Link>

      <div className="page-head">
        <h1>Add <em>Channel</em></h1>
      </div>

      <div className="panel">
        <div className="p-body">
          <CampaignForm brands={brands ?? []} defaultBrandId={defaultBrandId} />
        </div>
      </div>
    </div>
  )
}
