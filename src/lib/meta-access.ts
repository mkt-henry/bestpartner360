import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export type MetaAccessResult =
  | { ok: true; isAdmin: boolean; userId: string; allowedAccountIds: Set<string> }
  | { ok: false; status: number; error: string }

export async function getMetaAccessContext(): Promise<MetaAccessResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, status: 401, error: "Unauthorized" }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  const isAdmin = profile?.role === "admin"

  if (isAdmin) {
    const { data: all } = await admin
      .from("meta_ad_accounts")
      .select("meta_account_id")
    return {
      ok: true,
      isAdmin: true,
      userId: user.id,
      allowedAccountIds: new Set((all ?? []).map((r) => r.meta_account_id)),
    }
  }

  const { data: access } = await admin
    .from("user_brand_access")
    .select("brand_id")
    .eq("user_id", user.id)

  const brandIds = (access ?? []).map((r) => r.brand_id)
  if (brandIds.length === 0) {
    return { ok: true, isAdmin: false, userId: user.id, allowedAccountIds: new Set() }
  }

  const { data: accounts } = await admin
    .from("meta_ad_accounts")
    .select("meta_account_id")
    .in("brand_id", brandIds)

  return {
    ok: true,
    isAdmin: false,
    userId: user.id,
    allowedAccountIds: new Set((accounts ?? []).map((r) => r.meta_account_id)),
  }
}

export async function getAdAccountId(adId: string, accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${adId}?fields=account_id&access_token=${accessToken}`
    )
    if (!res.ok) return null
    const json = await res.json()
    return json.account_id ? `act_${json.account_id}` : null
  } catch {
    return null
  }
}
