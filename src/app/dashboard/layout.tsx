import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Sidebar from "@/components/layout/Sidebar"
import TopBar from "@/components/layout/TopBar"
import type { UserRole } from "@/types"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single()

  // viewer가 접근 가능한 첫 번째 브랜드명 가져오기
  const { data: brandAccess } = await supabase
    .from("user_brand_access")
    .select("brands(name)")
    .eq("user_id", user.id)
    .limit(1)
    .single()

  const brandName = (brandAccess?.brands as unknown as { name: string } | null)?.name

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        role={(profile?.role as UserRole) ?? "viewer"}
        brandName={brandName}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          userName={profile?.full_name ?? user.email ?? ""}
          title="대시보드"
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
