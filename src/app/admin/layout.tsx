import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Sidebar from "@/components/layout/Sidebar"
import TopBar from "@/components/layout/TopBar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const role = h.get("x-user-role")
  const userName = decodeURIComponent(h.get("x-user-name") ?? "")

  if (role !== "admin") redirect("/login")

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors">
      <Sidebar role="admin" brandName="관리자" />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar userName={userName} title="관리자" />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>
    </div>
  )
}
