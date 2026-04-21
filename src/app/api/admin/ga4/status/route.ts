import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("platform_credentials")
    .select("credentials, updated_at")
    .eq("platform", "ga4")
    .single()

  const creds = data?.credentials as
    | { access_token?: string; refresh_token?: string; expires_at?: number }
    | undefined

  const hasRefreshToken = !!creds?.refresh_token
  const expiresAt = typeof creds?.expires_at === "number" ? creds.expires_at : 0
  const accessTokenValid = !!creds?.access_token && Date.now() < expiresAt - 60_000

  return NextResponse.json({
    connected: hasRefreshToken,
    accessTokenValid,
    expiresAt: expiresAt || null,
    updatedAt: data?.updated_at ?? null,
  })
}
