import { getMetaCredentials } from "@/lib/credentials"
import { metaMetadata } from "./public"
import type { ProviderDefinition } from "./types"

export const metaProvider: ProviderDefinition = {
  ...metaMetadata,
  async hasCredentials() {
    const creds = await getMetaCredentials()
    return !!creds?.access_token
  },
  async listAccounts() {
    const creds = await getMetaCredentials()
    if (!creds) {
      return {
        ok: false,
        error: "Meta API 키가 설정되지 않았습니다. 설정 페이지에서 입력해주세요.",
        status: 500,
      }
    }
    const res = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?access_token=${creds.access_token}&fields=id,name,account_status&limit=100`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: err.error?.message ?? "Meta API error", status: res.status }
    }
    const json = await res.json()
    const accounts = ((json.data ?? []) as Array<{ id: string; name: string; account_status?: number }>).map(
      (a) => ({
        id: a.id,
        name: a.name,
        status: a.account_status != null ? String(a.account_status) : null,
      })
    )
    return { ok: true, accounts }
  },
}
