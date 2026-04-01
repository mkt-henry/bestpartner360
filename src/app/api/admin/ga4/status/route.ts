import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("platform_credentials")
    .select("credentials")
    .eq("platform", "ga4")
    .single()

  const connected = !!(data?.credentials?.refresh_token)

  return NextResponse.json({ connected })
}
