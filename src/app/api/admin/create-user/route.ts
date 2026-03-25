import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  // 요청자가 admin인지 확인
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { email, password, full_name, brand_id } = await request.json()

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: "필수 항목을 입력해주세요." }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // 유저 생성 (서비스 롤 키 사용)
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: "viewer" },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // 브랜드 접근 권한 부여
  if (brand_id && newUser.user) {
    await adminClient.from("user_brand_access").insert({
      user_id: newUser.user.id,
      brand_id,
    })
  }

  return NextResponse.json({ success: true })
}
