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

  if (!data?.credentials?.access_token) return null

  const creds = data.credentials as {
    access_token: string
    refresh_token?: string
    expires_at?: number
  }

  // 토큰 만료 확인 및 자동 갱신
  if (creds.refresh_token && creds.expires_at && Date.now() > creds.expires_at - 60_000) {
    const refreshed = await refreshGa4Token(creds.refresh_token)
    if (refreshed) return refreshed
  }

  return { access_token: creds.access_token }
}

async function refreshGa4Token(refreshToken: string): Promise<Ga4Credentials | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

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

    const tokenData = await res.json()
    if (!res.ok || !tokenData.access_token) return null

    // DB에 갱신된 토큰 저장
    const supabase = createAdminClient()
    await supabase.from("platform_credentials").upsert(
      {
        platform: "ga4",
        credentials: {
          access_token: tokenData.access_token,
          refresh_token: refreshToken,
          expires_at: Date.now() + tokenData.expires_in * 1000,
        },
      },
      { onConflict: "platform" }
    )

    return { access_token: tokenData.access_token }
  } catch {
    return null
  }
}

export interface KlaviyoCredentials {
  api_key: string
}

export async function getKlaviyoCredentials(): Promise<KlaviyoCredentials | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("platform_credentials")
    .select("credentials")
    .eq("platform", "klaviyo")
    .single()

  if (data?.credentials?.api_key) {
    return data.credentials as KlaviyoCredentials
  }

  if (process.env.KLAVIYO_API_KEY) {
    return { api_key: process.env.KLAVIYO_API_KEY }
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
