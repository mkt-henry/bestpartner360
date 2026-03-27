import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { user_id } = await request.json()
  if (!user_id) return NextResponse.json({ error: "user_id 필요" }, { status: 400 })

  // 자기 자신은 삭제 불가
  if (user_id === user.id) return NextResponse.json({ error: "본인 계정은 삭제할 수 없습니다." }, { status: 400 })

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
