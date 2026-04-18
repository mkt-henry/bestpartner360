import { NextResponse } from "next/server"
import crypto from "crypto"
import { getNaverCredentials } from "@/lib/credentials"

function generateSignature(timestamp: string, method: string, path: string, secretKey: string) {
  const message = `${timestamp}.${method}.${path}`
  return crypto.createHmac("sha256", secretKey).update(message).digest("base64")
}

async function naverFetch(method: string, path: string, creds: { api_key: string; secret_key: string; customer_id: string }) {
  const timestamp = String(Date.now())
  const signature = generateSignature(timestamp, method, path, creds.secret_key)

  return fetch(`https://api.searchad.naver.com${path}`, {
    method,
    headers: {
      "X-API-KEY": creds.api_key,
      "X-CUSTOMER": creds.customer_id,
      "X-Timestamp": timestamp,
      "X-Signature": signature,
    },
    next: { revalidate: 60 },
  })
}

export async function GET() {
  const creds = await getNaverCredentials()
  if (!creds) {
    return NextResponse.json(
      { error: "네이버 API 키가 설정되지 않았습니다. 설정 페이지에서 입력해주세요." },
      { status: 500 }
    )
  }

  // 1) MCC(대행사) 계정: managedCustomerLink로 하위 광고주 목록 조회
  const mccRes = await naverFetch("GET", "/ncc/managedCustomerLink", creds)

  if (mccRes.ok) {
    const data = await mccRes.json()
    const accounts = Array.isArray(data)
      ? data.map((item: { customerId: string; customerName?: string; loginId?: string }) => ({
          id: String(item.customerId),
          name: item.customerName ?? item.loginId ?? String(item.customerId),
        }))
      : []
    return NextResponse.json({ accounts })
  }

  // 2) 일반 광고주 계정: campaigns 엔드포인트로 연결 확인
  const campRes = await naverFetch("GET", "/ncc/campaigns", creds)

  if (campRes.ok) {
    // 연결 성공 — 본인 계정을 유일한 항목으로 반환
    return NextResponse.json({
      accounts: [{ id: creds.customer_id, name: `내 광고계정 (${creds.customer_id})` }],
    })
  }

  const err = await campRes.json().catch(() => ({ message: "Naver API error" }))
  return NextResponse.json(
    { error: err.title ?? err.message ?? "Naver API error" },
    { status: campRes.status }
  )
}
