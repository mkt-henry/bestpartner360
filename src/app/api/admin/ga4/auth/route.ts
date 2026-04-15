import { NextRequest, NextResponse } from "next/server"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!

const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
].join(" ")

function getBaseUrl(req: NextRequest) {
  // 환경변수 우선, 없으면 요청에서 추론
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  const proto = req.headers.get("x-forwarded-proto") ?? "https"
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000"
  return `${proto}://${host}`
}

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req)
  const redirectUri = `${baseUrl}/api/admin/ga4/callback`

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  )
}
