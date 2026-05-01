import { NextResponse } from "next/server"
import { getMetaCredentials } from "@/lib/credentials"

export async function GET() {
  const creds = await getMetaCredentials()
  if (!creds) {
    return NextResponse.json(
      { error: "Meta API 키가 설정되지 않았습니다. 설정 페이지에서 입력해주세요." },
      { status: 500 }
    )
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/adaccounts?access_token=${creds.access_token}&fields=id,name,account_status&limit=100`,
    { cache: "no-store" }
  )

  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json({ error: err.error?.message ?? "Meta API error" }, { status: res.status })
  }

  const json = await res.json()
  return NextResponse.json({ accounts: json.data ?? [] })
}
