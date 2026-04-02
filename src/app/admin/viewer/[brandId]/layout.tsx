import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Sidebar from "@/components/layout/Sidebar"
import TopBar from "@/components/layout/TopBar"
import Link from "next/link"
import { ArrowLeft, Eye } from "lucide-react"

export default async function AdminViewerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ brandId: string }>
}) {
  const h = await headers()
  const role = h.get("x-user-role")
  const userName = decodeURIComponent(h.get("x-user-name") ?? "")

  if (role !== "admin") redirect("/login")

  const { brandId } = await params

  const supabase = await createClient()
  const { data: brand } = await supabase
    .from("brands")
    .select("id, name")
    .eq("id", brandId)
    .single()

  if (!brand) redirect("/admin/viewer")

  const viewerBasePath = `/admin/viewer/${brandId}`

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors">
      <Sidebar role="viewer" brandName={brand.name} viewerBasePath={viewerBasePath} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar userName={userName} title="파트너 뷰어" />
        {/* Partner mode banner */}
        <div className="bg-blue-600 dark:bg-blue-700 px-4 md:px-6 py-2.5 flex items-center gap-3">
          <Link
            href="/admin/viewer"
            className="flex items-center gap-1.5 text-blue-100 hover:text-white transition text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">브랜드 목록</span>
          </Link>
          <div className="flex items-center gap-2 ml-auto">
            <Eye className="w-3.5 h-3.5 text-blue-200" />
            <span className="text-sm font-medium text-white">{brand.name}</span>
            <span className="text-xs text-blue-200">파트너 모드</span>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>
    </div>
  )
}
