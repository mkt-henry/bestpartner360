import "./console.css"
import { headers } from "next/headers"
import { JetBrains_Mono } from "next/font/google"
import { Sidebar } from "./_components/Sidebar"
import { getBrandMediaAvailability, parseBrandIds } from "@/lib/brand-media"
import { createClient } from "@/lib/supabase/server"

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export const metadata = {
  title: "BP360 · Console",
}

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const brandIds = parseBrandIds(h.get("x-user-brand-ids"))
  const brandName = h.get("x-user-brand-name")
    ? decodeURIComponent(h.get("x-user-brand-name")!)
    : undefined
  const userName = h.get("x-user-name")
    ? decodeURIComponent(h.get("x-user-name")!)
    : undefined
  const userRole = h.get("x-user-role") ?? undefined
  const supabase = await createClient()
  const mediaAvailability = await getBrandMediaAvailability(
    supabase as unknown as Parameters<typeof getBrandMediaAvailability>[0],
    brandIds
  )

  return (
    <div className={`console-scope ${jetbrainsMono.variable}`}>
      <div className="app">
        <Sidebar
          brandName={brandName}
          userName={userName}
          userRole={userRole}
          mediaAvailability={{
            hasMeta: mediaAvailability.hasMeta,
            hasGa4: mediaAvailability.hasGa4,
            hasSearchConsole: mediaAvailability.hasSearchConsole,
          }}
        />
        <main>{children}</main>
      </div>
    </div>
  )
}
