import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Topbar, FooterBar } from "../_components/Topbar"
import { createClient } from "@/lib/supabase/server"
import { RunButton } from "./RunButton"

export const dynamic = "force-dynamic"

type ReportRow = {
  id: string
  title: string
  description: string | null
  report_type: "manual" | "scheduled" | "ai"
  schedule_cron: string | null
  last_run_at: string | null
  author_id: string | null
  author: { full_name: string | null } | null
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toISOString().slice(0, 10)
}

function scheduleLabel(cron: string | null, type: string): string {
  if (!cron) return type === "manual" ? "—" : "Manual"
  // Minimal cron pattern recognizer
  if (/^0 0 \* \* \*$/.test(cron)) return "Daily"
  if (/^0 0 \* \* 1$/.test(cron)) return "Weekly"
  if (/^0 0 1 \* \*$/.test(cron)) return "Monthly"
  if (/^0 0 1 \*\/3 \*$/.test(cron)) return "Quarterly"
  return cron
}

function typeBadge(type: "manual" | "scheduled" | "ai") {
  if (type === "ai") {
    return { label: "AI · Auto", bg: "#c77dd61a", color: "#C77DD6" }
  }
  if (type === "scheduled") {
    return { label: "Scheduled", bg: "#7db8d61a", color: "#7DB8D6" }
  }
  return { label: "Manual", bg: "var(--bg-2)", color: "var(--text-2)" }
}

export default async function ConsoleReportsPage() {
  const h = await headers()
  const userId = h.get("x-user-id")
  const brandIdsHeader = h.get("x-user-brand-ids")
  const brandName = h.get("x-user-brand-name")
    ? decodeURIComponent(h.get("x-user-brand-name")!)
    : "Brand"

  if (!userId) redirect("/login")
  const brandIds = brandIdsHeader ? brandIdsHeader.split(",") : []

  const supabase = await createClient()
  let reports: ReportRow[] = []
  let schemaMissing = false
  let latestRunAt: string | null = null

  if (brandIds.length > 0) {
    const res = await supabase
      .from("reports")
      .select(
        "id, title, description, report_type, schedule_cron, last_run_at, author_id, author:user_profiles(full_name)"
      )
      .in("brand_id", brandIds)
      .order("created_at", { ascending: false })

    if (res.error?.code === "42P01") {
      schemaMissing = true
    } else {
      const raw = (res.data ?? []) as unknown as Array<
        ReportRow & { author: { full_name: string | null }[] | { full_name: string | null } | null }
      >
      reports = raw.map((r) => ({
        ...r,
        author: Array.isArray(r.author) ? r.author[0] ?? null : r.author,
      }))
      latestRunAt = reports.reduce<string | null>((latest, r) => {
        if (!r.last_run_at) return latest
        if (!latest || r.last_run_at > latest) return r.last_run_at
        return latest
      }, null)
    }
  }

  const scheduledCount = reports.filter((r) => r.schedule_cron).length

  return (
    <>
      <Topbar
        crumbs={[
          { label: "Workspace" },
          { label: brandName },
          { label: "Reports", strong: true },
        ]}
      />
      <div className="detail-head">
        <div className="dh-row">
          <div className="dh-main">
            <div className="src">
              <span className="ic">R</span>
              <span>
                Reports · {reports.length} saved · {scheduledCount} scheduled
              </span>
            </div>
            <h1>
              Reports &amp; <em>exports</em>
            </h1>
            <div className="dh-meta">
              <span>{reports.length} reports</span>
              <span>·</span>
              <span>
                Last generated <b>{latestRunAt ? formatRelativeDate(latestRunAt) : "—"}</b>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="canvas">
        {schemaMissing && (
          <div className="panel">
            <div className="p-body" style={{ padding: 24, color: "var(--dim)", fontSize: 12 }}>
              Reports 모듈 DB 스키마가 아직 적용되지 않았습니다.{" "}
              <code>supabase/migrations/010_reports.sql</code> 마이그레이션을 실행하세요.
            </div>
          </div>
        )}

        <div className="panel">
          <div className="p-head">
            <h3>All Reports</h3>
            <div className="sub">{reports.length} total</div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>Report</th>
                  <th>Author</th>
                  <th>Type</th>
                  <th className="num">Last run</th>
                  <th className="num">Schedule</th>
                  <th className="num">Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--dim)" }}>
                      {schemaMissing ? "스키마 미적용" : "저장된 리포트가 없습니다."}
                    </td>
                  </tr>
                )}
                {reports.map((r) => {
                  const badge = typeBadge(r.report_type)
                  return (
                    <tr key={r.id}>
                      <td>
                        <div>{r.title}</div>
                        {r.description && <div className="cell-sub">{r.description}</div>}
                      </td>
                      <td>{r.author?.full_name ?? "—"}</td>
                      <td>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 3,
                            background: badge.bg,
                            color: badge.color,
                            border: "1px solid var(--line)",
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="num">{formatRelativeDate(r.last_run_at)}</td>
                      <td className="num">{scheduleLabel(r.schedule_cron, r.report_type)}</td>
                      <td className="num">
                        <RunButton reportId={r.id} title={r.title} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <FooterBar />
    </>
  )
}
