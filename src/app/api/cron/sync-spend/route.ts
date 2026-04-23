import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { syncMetaSpendForBrand, syncNaverSpendForBrand, type SyncResult } from "@/lib/spend-sync"

export const dynamic = "force-dynamic"
// 브랜드 여러 개 × Meta/Naver API 호출 → 기본 10초보다 길게
export const maxDuration = 300

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // dev에서는 허용
  const header = req.headers.get("authorization")
  if (header === `Bearer ${secret}`) return true
  const key = req.nextUrl.searchParams.get("key")
  return key === secret
}

type BrandSyncReport = {
  brand_id: string
  meta?: SyncResult
  naver?: SyncResult
}

async function run(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  const [metaRes, naverRes] = await Promise.all([
    admin.from("meta_ad_accounts").select("brand_id"),
    admin.from("naver_ad_accounts").select("brand_id"),
  ])

  if (metaRes.error) {
    return NextResponse.json({ error: metaRes.error.message }, { status: 500 })
  }
  if (naverRes.error) {
    return NextResponse.json({ error: naverRes.error.message }, { status: 500 })
  }

  const metaBrandIds = new Set((metaRes.data ?? []).map((r) => r.brand_id as string))
  const naverBrandIds = new Set((naverRes.data ?? []).map((r) => r.brand_id as string))
  const allBrandIds = Array.from(new Set([...metaBrandIds, ...naverBrandIds]))

  const reports: BrandSyncReport[] = []
  let totalSynced = 0

  for (const brandId of allBrandIds) {
    const report: BrandSyncReport = { brand_id: brandId }

    if (metaBrandIds.has(brandId)) {
      report.meta = await syncMetaSpendForBrand(brandId)
      if (report.meta.synced) totalSynced += report.meta.synced
    }
    if (naverBrandIds.has(brandId)) {
      report.naver = await syncNaverSpendForBrand(brandId)
      if (report.naver.synced) totalSynced += report.naver.synced
    }

    reports.push(report)
  }

  return NextResponse.json({
    brands: allBrandIds.length,
    total_synced: totalSynced,
    reports,
  })
}

export const GET = run
export const POST = run
