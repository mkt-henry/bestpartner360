import "@/styles/console.css"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Fraunces, Instrument_Serif, JetBrains_Mono } from "next/font/google"
import { Sidebar } from "@/components/console/Sidebar"
import type { UserRole } from "@/types"

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-fraunces",
  display: "swap",
})
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
})
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
  const brandIdsHeader = h.get("x-user-brand-ids")
  const propertyCount = brandIdsHeader ? brandIdsHeader.split(",").length : 0

  if (!userId || !role) redirect("/login")

  return (
    <div
      className={`console-scope ${fraunces.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <div className="app">
        <Sidebar
          role={role}
          userName={userName}
          brandName={brandName}
          propertyCount={propertyCount}
        />
        <main>{children}</main>
      </div>
    </div>
  )
}
