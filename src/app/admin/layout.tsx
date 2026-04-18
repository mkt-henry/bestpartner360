import "@/styles/console.css"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { JetBrains_Mono } from "next/font/google"
import { Sidebar } from "@/components/console/Sidebar"

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
    <div className={`console-scope ${jetbrainsMono.variable}`}>
      <div className="app">
        <Sidebar role="admin" userName={userName} brandName="관리자" />
        <main>{children}</main>
      </div>
    </div>
  )
}
