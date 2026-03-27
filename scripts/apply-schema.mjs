import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = "https://dhxiifldvfzbmgoyamce.supabase.co"
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoeGlpZmxkdmZ6Ym1nb3lhbWNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQxOTM2MywiZXhwIjoyMDg5OTk1MzYzfQ.cDU7U1JjZtF_-NXMeVnPeJxF3NkLljkAJMzYKV0gPyA"

const sqlPath = join(__dirname, "../supabase/migrations/001_schema.sql")
const sql = readFileSync(sqlPath, "utf8")

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1]

async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ query })
  })
  return res
}

async function applySchema() {
  console.log("스키마 적용 중...")
  console.log("Note: Supabase SQL Editor에서 직접 실행해야 할 수 있습니다.")
  console.log("")
  console.log("=== SQL 내용 (Supabase SQL Editor에 복사하세요) ===")
  console.log("")
  console.log(sql)
}

applySchema()
