import { createAdminClient } from "@/lib/supabase/admin"

export interface MetaCredentials {
  access_token: string
}

export interface NaverCredentials {
  api_key: string
  secret_key: string
  customer_id: string
}

export interface Ga4Credentials {
  access_token: string
}

export interface Ga4OAuthCredentials {
  client_id: string
  client_secret: string
}

type StoredCredentials = Record<string, unknown>

type Ga4StoredCredentials = {
  access_token?: string
  refresh_token?: string
  expires_at?: number
  client_id?: string
  client_secret?: string
}

async function getStoredCredentials(platform: string): Promise<StoredCredentials | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("platform_credentials")
    .select("credentials")
    .eq("platform", platform)
    .single()

  return (data?.credentials as StoredCredentials | undefined) ?? null
}

export async function getMetaCredentials(): Promise<MetaCredentials | null> {
  const credentials = await getStoredCredentials("meta")

  if (typeof credentials?.access_token === "string" && credentials.access_token) {
    return credentials as unknown as MetaCredentials
  }

  if (process.env.META_ACCESS_TOKEN) {
    return { access_token: process.env.META_ACCESS_TOKEN }
  }

  return null
}

export async function getGa4OAuthCredentials(): Promise<Ga4OAuthCredentials | null> {
  const credentials = (await getStoredCredentials("ga4")) as Ga4StoredCredentials | null

  if (credentials?.client_id && credentials?.client_secret) {
    return {
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
    }
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
    }
  }

  return null
}

export async function getGa4Credentials(): Promise<Ga4Credentials | null> {
  const credentials = (await getStoredCredentials("ga4")) as Ga4StoredCredentials | null
  if (!credentials?.access_token) return null

  const isExpired = credentials.expires_at && Date.now() > credentials.expires_at - 60_000

  if (isExpired && credentials.refresh_token) {
    const refreshed = await refreshGa4Token(credentials.refresh_token)
    if (refreshed) return refreshed
    return null
  }

  if (!credentials.expires_at && credentials.refresh_token) {
    const refreshed = await refreshGa4Token(credentials.refresh_token)
    if (refreshed) return refreshed
  }

  return { access_token: credentials.access_token }
}

async function refreshGa4Token(refreshToken: string): Promise<Ga4Credentials | null> {
  const oauthCredentials = await getGa4OAuthCredentials()
  if (!oauthCredentials) return null

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: oauthCredentials.client_id,
        client_secret: oauthCredentials.client_secret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })

    const tokenData = await res.json()
    if (!res.ok || !tokenData.access_token) return null

    const current = ((await getStoredCredentials("ga4")) ?? {}) as Ga4StoredCredentials
    const supabase = createAdminClient()
    await supabase.from("platform_credentials").upsert(
      {
        platform: "ga4",
        credentials: {
          ...current,
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

export async function getNaverCredentials(): Promise<NaverCredentials | null> {
  const credentials = await getStoredCredentials("naver")

  if (credentials?.api_key && credentials?.secret_key && credentials?.customer_id) {
    return credentials as unknown as NaverCredentials
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
