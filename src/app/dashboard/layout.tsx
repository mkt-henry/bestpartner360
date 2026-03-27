import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Sidebar from "@/components/layout/Sidebar"
import TopBar from "@/components/layout/TopBar"
import type { UserRole } from "@/types"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const h = await headers()
  const userId = h.get("x-user-id")
  const userName = decodeURIComponent(h.get("x-user-name") ?? "")
  const role = h.get("x-user-role") as UserRole | null
  const brandName = h.get("x-user-brand-name")
    ? decodeURIComponent(h.get("x-user-brand-name")!)
    : undefined

  if (!userId || !role) redirect("/login")

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors">
      <Sidebar role={role ?? "viewer"} brandName={brandName} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar userName={userName} title="대시보드" />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>
    </div>
  )
}
