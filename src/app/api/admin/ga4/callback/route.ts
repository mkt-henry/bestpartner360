import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

function getBaseUrl(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  const proto = req.headers.get("x-forwarded-proto") ?? "https"
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000"
  return `${proto}://${host}`
}

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req)
  const code = req.nextUrl.searchParams.get("code")
  const error = req.nextUrl.searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(
      `${baseUrl}/admin/brands?ga4_error=${encodeURIComponent(error ?? "인증 실패")}`
    )
  }

  const redirectUri = `${baseUrl}/api/admin/ga4/callback`

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
    return NextResponse.redirect(
      `${baseUrl}/admin/brands?ga4_error=${encodeURIComponent(tokenData.error_description ?? tokenData.error ?? "토큰 교환 실패")}`
    )
  }

  // Store tokens in platform_credentials
  const supabase = createAdminClient()
  const { error: dbError } = await supabase.from("platform_credentials").upsert(
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

  if (dbError) {
    return NextResponse.redirect(
      `${baseUrl}/admin/brands?ga4_error=${encodeURIComponent("DB 저장 실패: " + dbError.message)}`
    )
  }

  return NextResponse.redirect(`${baseUrl}/admin/brands?ga4_connected=true`)
}
