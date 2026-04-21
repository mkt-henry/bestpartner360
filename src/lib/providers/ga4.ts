import { getGa4Credentials } from "@/lib/credentials"
import { createAdminClient } from "@/lib/supabase/admin"
import { ga4Metadata } from "./public"
import type { ProviderDefinition } from "./types"

interface Ga4PropertySummary {
  property: string
  displayName: string
  propertyType: string
}
interface Ga4AccountSummary {
  name: string
  account: string
  displayName: string
  propertySummaries?: Ga4PropertySummary[]
}

export const ga4Provider: ProviderDefinition = {
  ...ga4Metadata,
  async hasCredentials() {
    // Cheap DB lookup — avoids triggering an OAuth refresh on every page load.
    // "Stored" ≠ "usable"; listAccounts() surfaces refresh failures at fetch time.
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("platform_credentials")
      .select("credentials")
      .eq("platform", "ga4")
      .single()
    const refreshToken = (data?.credentials as { refresh_token?: string } | undefined)?.refresh_token
    return !!refreshToken
  },
  async listAccounts() {
    const creds = await getGa4Credentials()
    if (!creds) {
      return {
        ok: false,
        error: "GA4 인증이 만료되었거나 연결되지 않았습니다. Google 계정을 다시 연결해주세요.",
        status: 401,
      }
    }
    const res = await fetch(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200",
      { headers: { Authorization: `Bearer ${creds.access_token}` } }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return {
        ok: false,
        error: err?.error?.message ?? `Google API 오류 (${res.status})`,
        status: res.status,
      }
    }
    const data = await res.json()
    const summaries: Ga4AccountSummary[] = data.accountSummaries ?? []
    const accounts = summaries.flatMap((account) =>
      (account.propertySummaries ?? []).map((prop) => ({
        id: prop.property.replace("properties/", ""),
        name: `${prop.displayName} · ${account.displayName}`,
      }))
    )
    return { ok: true, accounts }
  },
}
