import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

function getRedirectUri(req: NextRequest) {
  const host = req.headers.get("host") ?? "localhost:3000"
  const protocol = host.startsWith("localhost") ? "http" : "https"
  return `${protocol}://${host}/api/admin/ga4/callback`
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  const error = req.nextUrl.searchParams.get("error")

  if (error || !code) {
    const host = req.headers.get("host") ?? "localhost:3000"
    const protocol = host.startsWith("localhost") ? "http" : "https"
    return NextResponse.redirect(
      `${protocol}://${host}/admin/brands?ga4_error=${encodeURIComponent(error ?? "인증 실패")}`
    )
  }

  const redirectUri = getRedirectUri(req)

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  const tokenData = await tokenRes.json()

  if (!tokenRes.ok || !tokenData.access_token) {
    const host = req.headers.get("host") ?? "localhost:3000"
    const protocol = host.startsWith("localhost") ? "http" : "https"
    return NextResponse.redirect(
      `${protocol}://${host}/admin/brands?ga4_error=${encodeURIComponent(tokenData.error_description ?? "토큰 교환 실패")}`
    )
  }

  // Store tokens in platform_credentials
  const supabase = createAdminClient()
  await supabase.from("platform_credentials").upsert(
    {
      platform: "ga4",
      credentials: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + tokenData.expires_in * 1000,
      },
    },
    { onConflict: "platform" }
  )

  const host = req.headers.get("host") ?? "localhost:3000"
  const protocol = host.startsWith("localhost") ? "http" : "https"
  return NextResponse.redirect(
    `${protocol}://${host}/admin/brands?ga4_connected=true`
  )
}
