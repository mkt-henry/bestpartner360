import { NextResponse } from "next/server"
import crypto from "crypto"
import { getNaverCredentials } from "@/lib/credentials"

function generateSignature(timestamp: string, method: string, path: string, secretKey: string) {
  const message = `${timestamp}.${method}.${path}`
  return crypto.createHmac("sha256", secretKey).update(message).digest("base64")
}

export async function GET() {
  const creds = await getNaverCredentials()
  if (!creds) {
    return NextResponse.json(
      { error: "네이버 API 키가 설정되지 않았습니다. 설정 페이지에서 입력해주세요." },
      { status: 500 }
    )
  }

  const timestamp = String(Date.now())
  const method = "GET"
  const path = "/ncc/managedCustomerLink"

  const signature = generateSignature(timestamp, method, path, creds.secret_key)

  const res = await fetch(`https://api.searchad.naver.com${path}`, {
    method,
    headers: {
      "X-API-KEY": creds.api_key,
      "X-CUSTOMER": creds.customer_id,
      "X-Timestamp": timestamp,
      "X-Signature": signature,
    },
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Naver API error" }))
    return NextResponse.json(
      { error: err.title ?? err.message ?? "Naver API error" },
      { status: res.status }
    )
  }

  const data = await res.json()

  const accounts = Array.isArray(data)
    ? data.map((item: { customerId: string; customerName?: string; loginId?: string }) => ({
        id: String(item.customerId),
        name: item.customerName ?? item.loginId ?? String(item.customerId),
      }))
    : []

  return NextResponse.json({ accounts })
}
