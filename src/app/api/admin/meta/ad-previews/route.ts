import { NextRequest, NextResponse } from "next/server"
import { getMetaCredentials } from "@/lib/credentials"

const META_API = "https://graph.facebook.com/v21.0"

export async function GET(req: NextRequest) {
  const creds = await getMetaCredentials()
  if (!creds) {
    return NextResponse.json({ error: "Meta API 키가 설정되지 않았습니다." }, { status: 500 })
  }

  const adIds = req.nextUrl.searchParams.get("ad_ids")
  if (!adIds) {
    return NextResponse.json({ error: "ad_ids 파라미터가 필요합니다." }, { status: 400 })
  }

  const ids = adIds.split(",").slice(0, 50) // max 50

  try {
    // Batch fetch: each ad's creative thumbnail + preview
    const results = await Promise.all(
      ids.map(async (adId) => {
        try {
          const res = await fetch(
            `${META_API}/${adId}?fields=id,name,creative{thumbnail_url,image_url,object_story_spec}&access_token=${creds.access_token}`
          )
          if (!res.ok) return { ad_id: adId, thumbnail_url: null, image_url: null }
          const json = await res.json()
          const creative = json.creative ?? {}
          const spec = creative.object_story_spec ?? {}
          const highQualityUrl =
            creative.image_url ??
            spec.link_data?.picture ??
            spec.link_data?.image_url ??
            spec.photo_data?.url ??
            null
          return {
            ad_id: adId,
            thumbnail_url: creative.thumbnail_url ?? highQualityUrl ?? null,
            image_url: highQualityUrl,
          }
        } catch {
          return { ad_id: adId, thumbnail_url: null, image_url: null }
        }
      })
    )

    return NextResponse.json({ previews: results })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
