import "@/styles/console.css"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { JetBrains_Mono } from "next/font/google"
import { Sidebar } from "@/components/console/Sidebar"
import { getBrandMediaAvailability, parseBrandIds } from "@/lib/brand-media"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/types"

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

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
  const brandIds = parseBrandIds(h.get("x-user-brand-ids"))
  const propertyCount = brandIds.length

  if (!userId || !role) redirect("/login")

  const supabase = await createClient()
  const availableMedia = await getBrandMediaAvailability(
    supabase as unknown as Parameters<typeof getBrandMediaAvailability>[0],
    brandIds
  )

  return (
    <div className={`console-scope ${jetbrainsMono.variable}`}>
      <div className="app">
        <Sidebar
          role={role}
          userName={userName}
          brandName={brandName}
          propertyCount={propertyCount}
          availableMedia={{ hasGa4: availableMedia.hasGa4 }}
        />
        <main>{children}</main>
      </div>
    </div>
  )
}
