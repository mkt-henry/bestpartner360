import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://dhxiifldvfzbmgoyamce.supabase.co"
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoeGlpZmxkdmZ6Ym1nb3lhbWNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQxOTM2MywiZXhwIjoyMDg5OTk1MzYzfQ.cDU7U1JjZtF_-NXMeVnPeJxF3NkLljkAJMzYKV0gPyA"

const ADMIN_EMAIL = "admin@bestpartner360.com"
const ADMIN_PASSWORD = "Admin@BP360!2026"
const ADMIN_FULL_NAME = "관리자"

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function createAdmin() {
  console.log("어드민 계정 생성 중...")

  // 1. Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: ADMIN_FULL_NAME,
      role: "admin"
    }
  })

  if (authError) {
    if (authError.message.includes("already been registered")) {
      console.log("이미 존재하는 이메일입니다. role만 admin으로 업데이트합니다.")

      // Get existing user
      const { data: users } = await supabase.auth.admin.listUsers()
      const existing = users?.users?.find(u => u.email === ADMIN_EMAIL)

      if (existing) {
        await supabase
          .from("user_profiles")
          .update({ role: "admin", full_name: ADMIN_FULL_NAME })
          .eq("id", existing.id)
        console.log("✅ role이 admin으로 업데이트됐습니다.")
      }
      return
    }
    console.error("❌ 인증 계정 생성 실패:", authError.message)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log("✅ Auth 계정 생성됨. ID:", userId)

  // 2. Upsert user_profiles with admin role
  const { error: profileError } = await supabase
    .from("user_profiles")
    .upsert({
      id: userId,
      email: ADMIN_EMAIL,
      full_name: ADMIN_FULL_NAME,
      role: "admin"
    })

  if (profileError) {
    console.error("❌ 프로필 생성 실패:", profileError.message)
    process.exit(1)
  }

  console.log("✅ 어드민 계정 생성 완료!")
  console.log("")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("  이메일  :", ADMIN_EMAIL)
  console.log("  비밀번호:", ADMIN_PASSWORD)
  console.log("  역할    : admin")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━")
}

createAdmin()
