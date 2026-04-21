import crypto from "crypto"
import { getNaverCredentials } from "@/lib/credentials"
import { naverMetadata } from "./public"
import type { ProviderDefinition } from "./types"

function signature(timestamp: string, method: string, path: string, secretKey: string) {
  return crypto
    .createHmac("sha256", secretKey)
    .update(`${timestamp}.${method}.${path}`)
    .digest("base64")
}

async function naverFetch(
  method: string,
  path: string,
  creds: { api_key: string; secret_key: string; customer_id: string }
) {
  const timestamp = String(Date.now())
  return fetch(`https://api.searchad.naver.com${path}`, {
    method,
    headers: {
      "X-API-KEY": creds.api_key,
      "X-CUSTOMER": creds.customer_id,
      "X-Timestamp": timestamp,
      "X-Signature": signature(timestamp, method, path, creds.secret_key),
    },
    next: { revalidate: 60 },
  })
}

export const naverProvider: ProviderDefinition = {
  ...naverMetadata,
  async hasCredentials() {
    const creds = await getNaverCredentials()
    return !!(creds?.api_key && creds?.secret_key && creds?.customer_id)
  },
  async listAccounts() {
    const creds = await getNaverCredentials()
    if (!creds) {
      return {
        ok: false,
        error: "네이버 API 키가 설정되지 않았습니다. 설정 페이지에서 입력해주세요.",
        status: 500,
      }
    }

    const mccRes = await naverFetch("GET", "/ncc/managedCustomerLink", creds)
    if (mccRes.ok) {
      const data = await mccRes.json()
      const accounts = Array.isArray(data)
        ? (data as Array<{ customerId: string; customerName?: string; loginId?: string }>).map(
            (item) => ({
              id: String(item.customerId),
              name: item.customerName ?? item.loginId ?? String(item.customerId),
            })
          )
        : []
      return { ok: true, accounts }
    }

    const campRes = await naverFetch("GET", "/ncc/campaigns", creds)
    if (campRes.ok) {
      return {
        ok: true,
        accounts: [{ id: creds.customer_id, name: `내 광고계정 (${creds.customer_id})` }],
      }
    }

    const err = await campRes.json().catch(() => ({ message: "Naver API error" }))
    return {
      ok: false,
      error: err.title ?? err.message ?? "Naver API error",
      status: campRes.status,
    }
  },
}
