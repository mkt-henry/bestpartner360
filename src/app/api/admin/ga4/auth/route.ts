import { NextRequest, NextResponse } from "next/server"
import { getGa4OAuthCredentials } from "@/lib/credentials"

const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
].join(" ")

function getBaseUrl(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  const proto = req.headers.get("x-forwarded-proto") ?? "https"
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000"
  return `${proto}://${host}`
}

export async function GET(req: NextRequest) {
  const oauthCredentials = await getGa4OAuthCredentials()
  if (!oauthCredentials) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0c10;color:#e4e4e7}div{text-align:center;max-width:520px;padding:2rem}h2{color:#e5553b}code{background:#1e1e2e;padding:2px 8px;border-radius:4px;font-size:13px}</style></head><body><div><h2>Google OAuth 설정 필요</h2><p>관리자 설정에서 GA4 <code>client_id</code>와 <code>client_secret</code>을 먼저 저장하세요.</p><p style="margin-top:1rem;color:#94a3b8;font-size:13px;line-height:1.7">Google Cloud Console의 승인된 리디렉션 URI에는 <code>${getBaseUrl(req)}/api/admin/ga4/callback</code>을 추가해야 합니다.</p></div></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }

  const baseUrl = getBaseUrl(req)
  const redirectUri = `${baseUrl}/api/admin/ga4/callback`

  const params = new URLSearchParams({
    client_id: oauthCredentials.client_id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "select_account consent",
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
}
