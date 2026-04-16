import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))

const sqlPath = join(__dirname, "../supabase/migrations/001_schema.sql")
const sql = readFileSync(sqlPath, "utf8")

async function applySchema() {
  console.log("스키마 적용 중...")
  console.log("Note: Supabase SQL Editor에서 직접 실행해야 할 수 있습니다.")
  console.log("")
  console.log("=== SQL 내용 (Supabase SQL Editor에 복사하세요) ===")
  console.log("")
  console.log(sql)
}

applySchema()
