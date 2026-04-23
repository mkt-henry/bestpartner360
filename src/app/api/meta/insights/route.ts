import { NextRequest, NextResponse } from "next/server"
import { getMetaCredentials } from "@/lib/credentials"
import { getMetaAccessContext } from "@/lib/meta-access"

const META_API = "https://graph.facebook.com/v21.0"

const LEVEL_FIELDS: Record<string, string> = {
  account: "impressions,reach,clicks,spend,cpc,cpm,ctr,frequency,actions,cost_per_action_type",
  campaign:
    "campaign_id,campaign_name,impressions,reach,clicks,spend,cpc,cpm,ctr,frequency,actions,cost_per_action_type",
  adset:
    "campaign_id,campaign_name,adset_id,adset_name,impressions,reach,clicks,spend,cpc,cpm,ctr,frequency,actions,cost_per_action_type,optimization_goal",
  ad: "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,reach,clicks,spend,cpc,cpm,ctr,frequency,actions,cost_per_action_type",
}

export async function GET(req: NextRequest) {
  const access = await getMetaAccessContext()
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const { searchParams } = req.nextUrl
  const accountId = searchParams.get("account_id")
  const since = searchParams.get("since")
  const until = searchParams.get("until")
  const level = searchParams.get("level") ?? "account"
  const filtering = searchParams.get("filtering")

  if (!accountId || !since || !until) {
    return NextResponse.json(
      { error: "account_id, since, until 파라미터가 필요합니다." },
      { status: 400 }
    )
  }

  if (!access.allowedAccountIds.has(accountId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const creds = await getMetaCredentials()
  if (!creds) {
    return NextResponse.json(
      { error: "Meta API 키가 설정되지 않았습니다." },
      { status: 500 }
    )
  }

  const fields = LEVEL_FIELDS[level] ?? LEVEL_FIELDS.account

  try {
    const summaryParams = new URLSearchParams({
      access_token: creds.access_token,
      fields,
      time_range: JSON.stringify({ since, until }),
      level,
      limit: "500",
    })

    if (filtering) {
      summaryParams.set("filtering", filtering)
    }

    const dailyParams = new URLSearchParams({
      access_token: creds.access_token,
      fields: "impressions,reach,clicks,spend,actions",
      time_range: JSON.stringify({ since, until }),
      time_increment: "1",
      level: "account",
      limit: "500",
    })

    if (filtering) {
      dailyParams.set("filtering", filtering)
    }

    const [summaryRes, dailyRes] = await Promise.all([
      fetch(`${META_API}/${accountId}/insights?${summaryParams}`),
      fetch(`${META_API}/${accountId}/insights?${dailyParams}`),
    ])

    if (!summaryRes.ok) {
      const err = await summaryRes.json()
      return NextResponse.json(
        { error: err.error?.message ?? "Meta API error" },
        { status: summaryRes.status }
      )
    }

    const summaryJson = await summaryRes.json()
    let allSummary = summaryJson.data ?? []

    let nextUrl = summaryJson.paging?.next
    while (nextUrl && allSummary.length < 1000) {
      const pageRes = await fetch(nextUrl)
      if (!pageRes.ok) break
      const pageJson = await pageRes.json()
      allSummary = allSummary.concat(pageJson.data ?? [])
      nextUrl = pageJson.paging?.next
    }

    const dailyJson = dailyRes.ok ? await dailyRes.json() : { data: [] }

    return NextResponse.json({
      summary: allSummary,
      daily: dailyJson.data ?? [],
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
