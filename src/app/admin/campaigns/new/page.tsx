import { createClient } from "@/lib/supabase/server"
import CampaignForm from "@/components/admin/CampaignForm"

export default async function NewCampaignPage() {
  const supabase = await createClient()
  const { data: brands } = await supabase.from("brands").select("id, name").order("name")

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900">새 캠페인 추가</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <CampaignForm brands={brands ?? []} />
      </div>
    </div>
  )
}
