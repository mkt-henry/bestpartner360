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

  if (data?.credentials?.access_token) {
    return data.credentials as Ga4Credentials
  }

  if (process.env.GA4_ACCESS_TOKEN) {
    return { access_token: process.env.GA4_ACCESS_TOKEN }
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
