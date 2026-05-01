import { NextRequest, NextResponse } from "next/server"
import { getGa4OAuthCredentials } from "@/lib/credentials"
import { createAdminClient } from "@/lib/supabase/admin"

function getBaseUrl(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  const proto = req.headers.get("x-forwarded-proto") ?? "https"
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000"
  return `${proto}://${host}`
}

function htmlResponse(title: string, message: string, redirectUrl?: string) {
  const meta = redirectUrl ? `<meta http-equiv="refresh" content="3;url=${redirectUrl}" />` : ""
  const headingClass = redirectUrl?.includes("ga4_connected") ? "ok" : "err"

  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8">${meta}<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc}div{text-align:center;max-width:500px;padding:2rem}.ok{color:#16a34a}.err{color:#dc2626}code{background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:13px;word-break:break-all}</style></head><body><div><h2 class="${headingClass}">${title}</h2><p>${message}</p>${redirectUrl ? "<p style='color:#94a3b8;font-size:13px'>3초 후 이동합니다...</p>" : ""}</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  )
}

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req)
  const code = req.nextUrl.searchParams.get("code")
  const error = req.nextUrl.searchParams.get("error")

  if (error || !code) {
    return htmlResponse(
      "인증 실패",
      `Google 인증 오류: <code>${error ?? "코드 없음"}</code>`,
      `${baseUrl}/admin/brands?ga4_error=${encodeURIComponent(error ?? "인증 실패")}`
    )
  }

  const oauthCredentials = await getGa4OAuthCredentials()
  if (!oauthCredentials) {
    return htmlResponse(
      "Google OAuth 설정 필요",
      "관리자 설정에서 GA4 client_id와 client_secret을 먼저 저장하세요.",
      `${baseUrl}/admin/settings`
    )
  }

  const redirectUri = `${baseUrl}/api/admin/ga4/callback`
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: oauthCredentials.client_id,
      client_secret: oauthCredentials.client_secret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  const tokenData = await tokenRes.json()

  if (!tokenRes.ok || !tokenData.access_token) {
    return htmlResponse(
      "토큰 교환 실패",
      `Google 오류: <code>${tokenData.error_description ?? tokenData.error ?? JSON.stringify(tokenData)}</code><br><br>redirect_uri: <code>${redirectUri}</code>`
    )
  }

  const supabase = createAdminClient()
  const { data: existing, error: readError } = await supabase
    .from("platform_credentials")
    .select("credentials")
    .eq("platform", "ga4")
    .single()

  if (readError && readError.code !== "PGRST116") {
    return htmlResponse("DB 조회 실패", `오류: <code>${readError.message}</code>`)
  }

  const current = (existing?.credentials ?? {}) as Record<string, unknown>
  const refreshToken = tokenData.refresh_token ?? current.refresh_token

  const { error: dbError } = await supabase.from("platform_credentials").upsert(
    {
      platform: "ga4",
      credentials: {
        ...current,
        client_id: oauthCredentials.client_id,
        client_secret: oauthCredentials.client_secret,
        access_token: tokenData.access_token,
        refresh_token: refreshToken,
        expires_at: Date.now() + tokenData.expires_in * 1000,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "platform" }
  )

  if (dbError) {
    return htmlResponse("DB 저장 실패", `오류: <code>${dbError.message}</code>`)
  }

  return htmlResponse(
    "GA4 연결 완료!",
    "Google Analytics 계정이 정상적으로 연결되었습니다.",
    `${baseUrl}/admin/brands?ga4_connected=true`
  )
}
