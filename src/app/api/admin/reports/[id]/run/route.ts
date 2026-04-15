import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateReportCsv, type ReportConfig } from "@/lib/report-generator"

export const dynamic = "force-dynamic"

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  return { user, role: profile?.role ?? "viewer" }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id: reportId } = await ctx.params
  const admin = createAdminClient()

  const { data: report, error: reportErr } = await admin
    .from("reports")
    .select("id, brand_id, title, config")
    .eq("id", reportId)
    .single()

  if (reportErr?.code === "42P01") {
    return NextResponse.json({ error: "reports schema not applied" }, { status: 503 })
  }
  if (reportErr || !report) {
    return NextResponse.json({ error: "report not found" }, { status: 404 })
  }

  if (auth.role !== "admin") {
    const { data: access } = await admin
      .from("user_brand_access")
      .select("brand_id")
      .eq("user_id", auth.user.id)
      .eq("brand_id", report.brand_id)
      .maybeSingle()
    if (!access) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { data: run } = await admin
    .from("report_runs")
    .insert({
      report_id: report.id,
      brand_id: report.brand_id,
      status: "running",
    })
    .select("id")
    .single()

  try {
    const { csv, filename } = await generateReportCsv(
      report.brand_id,
      (report.config ?? {}) as ReportConfig
    )

    const now = new Date().toISOString()
    if (run?.id) {
      await admin
        .from("report_runs")
        .update({ status: "success", completed_at: now })
        .eq("id", run.id)
    }
    await admin.from("reports").update({ last_run_at: now }).eq("id", report.id)

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown"
    if (run?.id) {
      await admin
        .from("report_runs")
        .update({
          status: "failed",
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id)
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
