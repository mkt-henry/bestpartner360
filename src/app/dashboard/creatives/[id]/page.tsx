import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import CreativeDetail from "@/components/viewer/CreativeDetail"

export default async function CreativeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single()

  const { data: creative } = await supabase
    .from("creatives")
    .select(`
      id, title, channel, asset_type, status, description, scheduled_date, brand_id,
      creative_versions(id, version_number, file_url, uploaded_at),
      campaigns(name)
    `)
    .eq("id", id)
    .single()

  if (!creative) notFound()

  // 접근 권한 확인
  const { data: access } = await supabase
    .from("user_brand_access")
    .select("brand_id")
    .eq("user_id", user.id)
    .eq("brand_id", creative.brand_id)
    .maybeSingle()

  const isAdmin = profile?.role === "admin"
  if (!isAdmin && !access) notFound()

  // 댓글 (최신순)
  const { data: comments } = await supabase
    .from("creative_comments")
    .select("id, content, created_at, user_profiles(full_name, role)")
    .eq("creative_id", id)
    .order("created_at", { ascending: true })

  return (
    <CreativeDetail
      creative={creative as unknown as Parameters<typeof CreativeDetail>[0]["creative"]}
      comments={(comments ?? []) as unknown as Parameters<typeof CreativeDetail>[0]["comments"]}
      currentUserId={user.id}
      isAdmin={isAdmin}
    />
  )
}
