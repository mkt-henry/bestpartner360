import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const SUPPORTED_PLATFORMS = ["meta", "naver", "ga4"] as const

type CredentialPlatform = (typeof SUPPORTED_PLATFORMS)[number]

const REQUIRED_FIELDS: Record<CredentialPlatform, string[]> = {
  meta: ["access_token"],
  naver: ["api_key", "secret_key", "customer_id"],
  ga4: ["client_id", "client_secret"],
}

async function validateMetaToken(accessToken: string): Promise<string | null> {
  const qs = new URLSearchParams({
    access_token: accessToken,
    fields: "id,name,account_status",
    limit: "1",
  })

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/me/adaccounts?${qs.toString()}`, {
      cache: "no-store",
    })

    if (res.ok) return null

    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
    return json?.error?.message ?? `Meta API HTTP ${res.status}`
  } catch (error) {
    return error instanceof Error ? error.message : "Meta token validation failed"
  }
}

function isSupportedPlatform(platform: unknown): platform is CredentialPlatform {
  return typeof platform === "string" && SUPPORTED_PLATFORMS.includes(platform as CredentialPlatform)
}

function maskValue(value: unknown) {
  const raw = typeof value === "string" ? value : String(value ?? "")
  if (!raw) return ""
  if (raw.length <= 4) return "*".repeat(raw.length)
  return `${raw.slice(0, 4)}${"*".repeat(Math.min(raw.length - 4, 20))}`
}

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("platform_credentials")
      .select("platform, credentials, updated_at")
      .order("platform")

    if (error) {
      console.error("[GET /api/admin/credentials] supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const masked = (data ?? []).map((row) => {
      const credentials = (row.credentials ?? {}) as Record<string, unknown>

      return {
        platform: row.platform,
        updated_at: row.updated_at,
        has_credentials: Object.values(credentials).some((value) => value !== null && value !== undefined && value !== ""),
        fields: Object.fromEntries(Object.entries(credentials).map(([key, value]) => [key, maskValue(value)])),
      }
    })

    return NextResponse.json({ credentials: masked })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/admin/credentials] unhandled exception:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { platform, credentials } = await req.json()

  if (!isSupportedPlatform(platform) || !credentials || typeof credentials !== "object") {
    return NextResponse.json({ error: "Invalid credentials payload" }, { status: 400 })
  }

  const incoming = Object.fromEntries(
    Object.entries(credentials as Record<string, unknown>).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ])
  )
  const missing = REQUIRED_FIELDS[platform].filter((field) => {
    const value = incoming[field]
    return typeof value !== "string" || !value.trim()
  })

  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 })
  }

  if (platform === "meta") {
    const validationError = await validateMetaToken(String(incoming.access_token))
    if (validationError) {
      return NextResponse.json(
        { error: `Meta access token validation failed: ${validationError}` },
        { status: 400 }
      )
    }
  }

  const supabase = createAdminClient()
  const { data: existing, error: readError } = await supabase
    .from("platform_credentials")
    .select("credentials")
    .eq("platform", platform)
    .single()

  if (readError && readError.code !== "PGRST116") {
    return NextResponse.json({ error: readError.message }, { status: 500 })
  }

  const mergedCredentials =
    platform === "ga4"
      ? { ...((existing?.credentials ?? {}) as Record<string, unknown>), ...incoming }
      : incoming

  const { error } = await supabase.from("platform_credentials").upsert(
    {
      platform,
      credentials: mergedCredentials,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "platform" }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { platform } = await req.json()

  if (!isSupportedPlatform(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from("platform_credentials").delete().eq("platform", platform)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
