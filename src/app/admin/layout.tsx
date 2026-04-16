import "@/styles/console.css"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Fraunces, Instrument_Serif, JetBrains_Mono } from "next/font/google"
import { Sidebar } from "@/components/console/Sidebar"

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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const role = h.get("x-user-role")
  const userName = decodeURIComponent(h.get("x-user-name") ?? "")

  if (role !== "admin") redirect("/login")

  return (
    <div
      className={`console-scope ${fraunces.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <div className="app">
        <Sidebar role="admin" userName={userName} brandName="관리자" />
        <main>{children}</main>
      </div>
    </div>
  )
}
