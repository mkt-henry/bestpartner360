import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function AdminViewerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ brandId: string }>
}) {
  const h = await headers()
  const role = h.get("x-user-role")
  if (role !== "admin") redirect("/login")

  const { brandId } = await params
  const supabase = await createClient()
  const { data: brand } = await supabase
    .from("brands")
    .select("id, name")
    .eq("id", brandId)
    .single()

  if (!brand) redirect("/admin/viewer")

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 24px', borderBottom: '1px solid var(--line)',
        background: 'var(--bg-1)', fontSize: 11,
      }}>
        <Link href="/admin/viewer" className="back">◀ 브랜드 목록</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{brand.name}</span>
          <span className="tag warn">파트너 모드</span>
        </div>
      </div>
      {children}
    </div>
  )
}
