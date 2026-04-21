import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProvider } from "@/lib/providers/registry"

interface LinkBody {
  brand_id?: string
  account_id?: string
  account_name?: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const provider = getProvider(id)
  if (!provider) {
    return NextResponse.json({ error: `Unknown provider: ${id}` }, { status: 404 })
  }

  const { brand_id, account_id, account_name } = (await req.json()) as LinkBody
  if (!brand_id || !account_id || !account_name) {
    return NextResponse.json(
      { error: "Missing fields: brand_id, account_id, account_name" },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  if (provider.linkAccount) {
    const result = await provider.linkAccount(supabase, { brand_id, account_id, account_name })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { table, accountIdColumn, accountNameColumn } = provider.mapping
  const { error } = await supabase
    .from(table)
    .upsert(
      {
        brand_id,
        [accountIdColumn]: account_id,
        [accountNameColumn]: account_name,
      },
      { onConflict: accountIdColumn }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const provider = getProvider(id)
  if (!provider) {
    return NextResponse.json({ error: `Unknown provider: ${id}` }, { status: 404 })
  }

  const { account_id, brand_id } = (await req.json()) as {
    account_id?: string
    brand_id?: string
  }
  if (!account_id) {
    return NextResponse.json({ error: "Missing account_id" }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (provider.unlinkAccount) {
    const result = await provider.unlinkAccount(supabase, { account_id, brand_id })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { table, accountIdColumn } = provider.mapping
  const query = supabase.from(table).delete().eq(accountIdColumn, account_id)
  // For multi-per-brand mappings (GA4), scope the delete to the caller's brand
  // so one brand can't disconnect another brand's property.
  const finalQuery =
    provider.mapping.multiplePerBrand && brand_id ? query.eq("brand_id", brand_id) : query

  const { error } = await finalQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
