import { NextResponse } from "next/server"
import { getGa4Credentials } from "@/lib/credentials"

interface Ga4PropertySummary {
  property: string       // "properties/123456789"
  displayName: string
  propertyType: string
}

interface Ga4AccountSummary {
  name: string
  account: string        // "accounts/123456"
  displayName: string
  propertySummaries?: Ga4PropertySummary[]
}

export async function GET() {
  const creds = await getGa4Credentials()
  if (!creds) {
    return NextResponse.json(
      { error: "GA4 액세스 토큰이 설정되지 않았습니다. API 설정에서 먼저 등록하세요." },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200",
      {
        headers: { Authorization: `Bearer ${creds.access_token}` },
      }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const message = err?.error?.message ?? `Google API 오류 (${res.status})`
      return NextResponse.json({ error: message }, { status: res.status })
    }

    const data = await res.json()
    const accountSummaries: Ga4AccountSummary[] = data.accountSummaries ?? []

    // 모든 계정의 속성을 플랫하게 변환
    const properties = accountSummaries.flatMap((account) =>
      (account.propertySummaries ?? []).map((prop) => ({
        id: prop.property.replace("properties/", ""),
        name: prop.displayName,
        accountName: account.displayName,
        propertyType: prop.propertyType,
      }))
    )

    return NextResponse.json({ properties })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GA4 속성 조회 실패" },
      { status: 500 }
    )
  }
}
