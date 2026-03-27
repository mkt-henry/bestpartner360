import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))

const PROJECT_REF = "dhxiifldvfzbmgoyamce"
const ACCESS_TOKEN = "sbp_1455e41b4b9dc59fc126d99abc6a9368f0abd9de"
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoeGlpZmxkdmZ6Ym1nb3lhbWNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQxOTM2MywiZXhwIjoyMDg5OTk1MzYzfQ.cDU7U1JjZtF_-NXMeVnPeJxF3NkLljkAJMzYKV0gPyA"
const SUPABASE_URL = "https://dhxiifldvfzbmgoyamce.supabase.co"

const sqlPath = join(__dirname, "../supabase/migrations/001_schema.sql")
const sql = readFileSync(sqlPath, "utf8")

async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ACCESS_TOKEN}`
    },
    body: JSON.stringify({ query })
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data }
}

async function main() {
  console.log("1. 스키마 마이그레이션 실행 중...")
  const { ok, status, data } = await runSQL(sql)

  if (!ok) {
    console.error("❌ 마이그레이션 실패:", status, JSON.stringify(data, null, 2))
    process.exit(1)
  }
  console.log("✅ 스키마 적용 완료")

  // 2. 이미 생성된 auth 유저 프로필 upsert (admin role)
  console.log("2. 어드민 프로필 설정 중...")
  const adminUserId = "d4664ee2-a59d-482c-98c9-8947afa7d065"
  const { ok: ok2, data: data2 } = await runSQL(`
    INSERT INTO user_profiles (id, email, full_name, role)
    VALUES ('${adminUserId}', 'admin@bestpartner360.com', '관리자', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = '관리자';
  `)

  if (!ok2) {
    console.error("❌ 프로필 설정 실패:", JSON.stringify(data2, null, 2))
    process.exit(1)
  }

  console.log("")
  console.log("✅ 완료!")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("  이메일  : admin@bestpartner360.com")
  console.log("  비밀번호: Admin@BP360!2026")
  console.log("  역할    : admin")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
}

main()
