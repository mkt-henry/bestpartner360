import { NextRequest, NextResponse } from "next/server"

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
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0c10;color:#e4e4e7}div{text-align:center;max-width:520px;padding:2rem}h2{color:#e5553b}code{background:#1e1e2e;padding:2px 8px;border-radius:4px;font-size:13px}</style></head><body><div><h2>Google OAuth 설정 필요</h2><p><code>GOOGLE_CLIENT_ID</code>와 <code>GOOGLE_CLIENT_SECRET</code> 환경변수가 설정되지 않았습니다.</p><p style="margin-top:1rem;color:#94a3b8;font-size:13px;line-height:1.7">1. <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color:#6FA8F5">Google Cloud Console</a>에서 OAuth 2.0 클라이언트 ID를 생성하세요.<br>2. 승인된 리디렉션 URI에 <code>${getBaseUrl(req)}/api/admin/ga4/callback</code>을 추가하세요.<br>3. Vercel 또는 <code>.env.local</code>에 환경변수를 등록하세요.</p></div></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }

  const baseUrl = getBaseUrl(req)
  const redirectUri = `${baseUrl}/api/admin/ga4/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "select_account consent",
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  )
}
