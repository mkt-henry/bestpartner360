import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { user_id, full_name, email, password, brand_ids } = await request.json()
  if (!user_id) return NextResponse.json({ error: "user_id 필요" }, { status: 400 })

  const adminClient = createAdminClient()

  // Auth 정보 업데이트
  const authUpdate: Record<string, string> = {}
  if (email) authUpdate.email = email
  if (password) authUpdate.password = password

  if (Object.keys(authUpdate).length > 0) {
    const { error } = await adminClient.auth.admin.updateUserById(user_id, { ...authUpdate, email_confirm: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // 프로필 업데이트
  const profileUpdate: Record<string, string> = {}
  if (full_name) profileUpdate.full_name = full_name
  if (email) profileUpdate.email = email

  if (Object.keys(profileUpdate).length > 0) {
    await adminClient.from("user_profiles").update(profileUpdate).eq("id", user_id)
  }

  // 브랜드 접근 권한 교체
  if (Array.isArray(brand_ids)) {
    await adminClient.from("user_brand_access").delete().eq("user_id", user_id)
    if (brand_ids.length > 0) {
      await adminClient.from("user_brand_access").insert(
        brand_ids.map((brand_id: string) => ({ user_id, brand_id }))
      )
    }
  }

  return NextResponse.json({ success: true })
}
