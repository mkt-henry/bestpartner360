import { NextResponse } from "next/server"

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json({ error: "META_ACCESS_TOKEN not configured" }, { status: 500 })
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/adaccounts?access_token=${token}&fields=id,name,account_status&limit=100`,
    { next: { revalidate: 60 } }
  )

  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json({ error: err.error?.message ?? "Meta API error" }, { status: res.status })
  }

  const json = await res.json()
  return NextResponse.json({ accounts: json.data ?? [] })
}
