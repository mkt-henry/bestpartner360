import { NextResponse } from "next/server"
import { getProvider } from "@/lib/providers/registry"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const provider = getProvider(id)
  if (!provider) {
    return NextResponse.json({ error: `Unknown provider: ${id}` }, { status: 404 })
  }

  const result = await provider.listAccounts()
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 })
  }
  return NextResponse.json({ accounts: result.accounts })
}
