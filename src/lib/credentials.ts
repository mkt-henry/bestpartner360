import { createAdminClient } from "@/lib/supabase/admin"

export interface MetaCredentials {
  access_token: string
}

export interface NaverCredentials {
  api_key: string
  secret_key: string
  customer_id: string
}

export async function getMetaCredentials(): Promise<MetaCredentials | null> {
  // DB 우선, 없으면 환경변수 폴백
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("platform_credentials")
    .select("credentials")
    .eq("platform", "meta")
    .single()

  if (data?.credentials?.access_token) {
    return data.credentials as MetaCredentials
  }

  if (process.env.META_ACCESS_TOKEN) {
    return { access_token: process.env.META_ACCESS_TOKEN }
  }

  return null
}

export interface Ga4Credentials {
  access_token: string
}

export async function getGa4Credentials(): Promise<Ga4Credentials | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("platform_credentials")
    .select("credentials")
    .eq("platform", "ga4")
    .single()

  const creds = data?.credentials as
    | { access_token?: string; refresh_token?: string; expires_at?: number }
    | undefined

  if (!creds) return null

  // refresh_token이 있으면 access_token이 비어있어도 복구 가능
  if (!creds.access_token && !creds.refresh_token) return null

  // expires_at이 숫자가 아니거나 없으면 만료로 간주해 한 번만 갱신 시도
  const expiresAt = typeof creds.expires_at === "number" ? creds.expires_at : 0
  const isExpired = Date.now() > expiresAt - 60_000

  if (isExpired) {
    if (!creds.refresh_token) {
      console.error("[ga4] access_token expired and no refresh_token available — reauth required")
      return null
    }
    const refreshed = await refreshGa4Token(creds.refresh_token)
    if (refreshed) return refreshed
    return null
  }

  return { access_token: creds.access_token! }
}

async function refreshGa4Token(refreshToken: string): Promise<Ga4Credentials | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error("[ga4] refresh skipped: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set")
    return null
  }

  let tokenData: {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  } = {}

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })

    tokenData = await res.json().catch(() => ({}))

    if (!res.ok || !tokenData.access_token) {
      console.error(
        `[ga4] refresh failed (HTTP ${res.status}): ${tokenData.error ?? "unknown"} — ${tokenData.error_description ?? ""}`
      )
      // invalid_grant는 refresh_token이 영구적으로 무효 → 재인증 유도를 위해 만료 처리
      if (tokenData.error === "invalid_grant") {
        const supabase = createAdminClient()
        await supabase
          .from("platform_credentials")
          .update({
            credentials: { refresh_token: null, access_token: null, expires_at: 0 },
            updated_at: new Date().toISOString(),
          })
          .eq("platform", "ga4")
      }
      return null
    }
  } catch (err) {
    console.error("[ga4] refresh network error:", err instanceof Error ? err.message : err)
    return null
  }

  const expiresInSec = typeof tokenData.expires_in === "number" ? tokenData.expires_in : 3600

  // refresh_token rotation: Google이 새로 내려주면 그걸 쓰고, 아니면 기존 것 유지
  const newRefreshToken = tokenData.refresh_token ?? refreshToken

  const supabase = createAdminClient()
  const { error: upsertErr } = await supabase.from("platform_credentials").upsert(
    {
      platform: "ga4",
      credentials: {
        access_token: tokenData.access_token,
        refresh_token: newRefreshToken,
        expires_at: Date.now() + expiresInSec * 1000,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "platform" }
  )

  if (upsertErr) {
    console.error("[ga4] refresh succeeded but DB upsert failed:", upsertErr.message)
  }

  return { access_token: tokenData.access_token }
}

export interface TiktokCredentials {
  access_token: string
  app_id: string
  secret: string
}

export async function getTiktokCredentials(): Promise<TiktokCredentials | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("platform_credentials")
    .select("credentials")
    .eq("platform", "tiktok")
    .single()

  const creds = data?.credentials as Partial<TiktokCredentials> | undefined

  if (creds?.access_token && creds?.app_id && creds?.secret) {
    return creds as TiktokCredentials
  }

  if (
    process.env.TIKTOK_ACCESS_TOKEN &&
    process.env.TIKTOK_APP_ID &&
    process.env.TIKTOK_APP_SECRET
  ) {
    return {
      access_token: process.env.TIKTOK_ACCESS_TOKEN,
      app_id: process.env.TIKTOK_APP_ID,
      secret: process.env.TIKTOK_APP_SECRET,
    }
  }

  return null
}

export async function getNaverCredentials(): Promise<NaverCredentials | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("platform_credentials")
    .select("credentials")
    .eq("platform", "naver")
    .single()

  if (data?.credentials?.api_key && data?.credentials?.secret_key && data?.credentials?.customer_id) {
    return data.credentials as NaverCredentials
  }

  if (process.env.NAVER_AD_API_KEY && process.env.NAVER_AD_SECRET_KEY && process.env.NAVER_AD_CUSTOMER_ID) {
    return {
      api_key: process.env.NAVER_AD_API_KEY,
      secret_key: process.env.NAVER_AD_SECRET_KEY,
      customer_id: process.env.NAVER_AD_CUSTOMER_ID,
    }
  }

  return null
}
