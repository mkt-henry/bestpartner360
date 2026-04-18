export type BrandMediaAvailability = {
  hasMeta: boolean
  hasNaver: boolean
  hasGa4: boolean
  hasSearchConsole: boolean
  campaignChannels: string[]
}

type SupabaseLike = {
  from: (table: string) => {
    select: (...args: unknown[]) => {
      in: (column: string, values: string[]) => Promise<{ data: Record<string, unknown>[] | null }>
      limit: (value: number) => Promise<{ data: Record<string, unknown>[] | null }>
    }
  }
}

export function parseBrandIds(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
}

export async function getBrandMediaAvailability(
  supabase: SupabaseLike,
  brandIds: string[]
): Promise<BrandMediaAvailability> {
  if (brandIds.length === 0) {
    return {
      hasMeta: false,
      hasNaver: false,
      hasGa4: false,
      hasSearchConsole: false,
      campaignChannels: [],
    }
  }

  const [metaRes, naverRes, ga4PropsRes, utmRes, campaignsRes] = await Promise.all([
    supabase.from("meta_ad_accounts").select("id").in("brand_id", brandIds),
    supabase.from("naver_ad_accounts").select("id").in("brand_id", brandIds),
    supabase.from("ga4_properties").select("id, website_url").in("brand_id", brandIds),
    supabase.from("ga4_utm_entries").select("id").in("brand_id", brandIds),
    supabase.from("campaigns").select("channel").in("brand_id", brandIds),
  ])

  const ga4Properties = ga4PropsRes.data ?? []
  const campaignChannels = Array.from(
    new Set(
      (campaignsRes.data ?? [])
        .map((row) => (typeof row.channel === "string" ? row.channel.trim() : ""))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))

  return {
    hasMeta: (metaRes.data?.length ?? 0) > 0,
    hasNaver: (naverRes.data?.length ?? 0) > 0,
    hasGa4: ga4Properties.length > 0 || (utmRes.data?.length ?? 0) > 0,
    hasSearchConsole: ga4Properties.some(
      (row) => typeof row.website_url === "string" && row.website_url.trim().length > 0
    ),
    campaignChannels,
  }
}
